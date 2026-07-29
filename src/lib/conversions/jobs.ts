import { getBackendEnvironment } from "@/lib/backend/env";
import { isWithinProviderUploadLimit } from "./limits";
import type { ConversionDefinition } from "./registry";
import type { WebpageSecurityPolicy } from "./webpage-security.server";

export type ConversionJobStatus =
  | "queued"
  | "validating"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface ConversionJob {
  readonly id: string;
  readonly conversionId: string;
  readonly status: ConversionJobStatus;
  readonly progress: number | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly outputAvailable: boolean;
  readonly expiresAt: string | null;
}

export interface ConversionProvider {
  createJob(input: {
    readonly ownerId: string;
    readonly conversionId: string;
    readonly file?: File;
    readonly sourceUrl?: string;
    readonly webpageSecurityPolicy?: WebpageSecurityPolicy;
  }): Promise<ConversionJob>;
  getJob(ownerId: string, jobId: string): Promise<ConversionJob>;
  cancelJob(ownerId: string, jobId: string): Promise<ConversionJob>;
  downloadJob(
    ownerId: string,
    jobId: string,
  ): Promise<{
    readonly body: ArrayBuffer;
    readonly mimeType: string;
    readonly fileName: string;
  }>;
}

const JOB_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,127}$/;
const MAX_PROVIDER_OUTPUT_BYTES = 250 * 1024 * 1024;

export class ConversionJobIdError extends Error {
  readonly code = "INVALID_JOB_ID";

  constructor() {
    super("Invalid conversion job identifier.");
    this.name = "ConversionJobIdError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJobStatus(value: unknown): value is ConversionJobStatus {
  return (
    value === "queued" ||
    value === "validating" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "expired"
  );
}

function parseJob(payload: unknown): ConversionJob {
  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    !JOB_ID_PATTERN.test(payload.id) ||
    typeof payload.conversionId !== "string" ||
    !isJobStatus(payload.status)
  ) {
    throw new Error("The conversion provider returned an invalid job response.");
  }
  return {
    id: payload.id,
    conversionId: payload.conversionId,
    status: payload.status,
    progress:
      typeof payload.progress === "number" &&
      Number.isFinite(payload.progress)
        ? Math.max(0, Math.min(100, payload.progress))
        : null,
    errorCode:
      typeof payload.errorCode === "string" ? payload.errorCode : null,
    errorMessage:
      typeof payload.errorMessage === "string"
        ? payload.errorMessage
        : null,
    outputAvailable: payload.outputAvailable === true,
    expiresAt:
      typeof payload.expiresAt === "string" ? payload.expiresAt : null,
  };
}

function safeOutputFileName(value: string | null) {
  const normalized = (value ?? "PDFMantra-conversion-output")
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return normalized || "PDFMantra-conversion-output";
}

class HttpConversionProvider implements ConversionProvider {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    baseUrl: string,
    token: string,
  ) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request(
    path: string,
    init: RequestInit,
  ) {
    const url = new URL(path, `${this.baseUrl.replace(/\/+$/, "")}/`);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      const errorCode = response.status === 429 ? "PROVIDER_RATE_LIMIT" : "PROVIDER_ERROR";
      throw new Error(
        `${errorCode}: Conversion provider returned status ${response.status}.`,
      );
    }
    return response;
  }

  async createJob(input: {
    readonly ownerId: string;
    readonly conversionId: string;
    readonly file?: File;
    readonly sourceUrl?: string;
    readonly webpageSecurityPolicy?: WebpageSecurityPolicy;
  }) {
    const form = new FormData();
    form.set("conversionId", input.conversionId);
    if (input.file) form.set("file", input.file, input.file.name);
    if (input.sourceUrl) form.set("sourceUrl", input.sourceUrl);
    if (input.webpageSecurityPolicy) {
      form.set(
        "webpageSecurityPolicy",
        JSON.stringify(input.webpageSecurityPolicy),
      );
    }
    if (input.file && !isWithinProviderUploadLimit(input.file.size)) {
      throw new Error("FILE_TOO_LARGE: Conversion source exceeds the provider upload limit.");
    }
    const response = await this.request("conversions/jobs", {
      method: "POST",
      headers: {
        "X-PDFMantra-Owner": input.ownerId,
      },
      body: form,
    });
    return parseJob(await response.json());
  }

  async getJob(ownerId: string, jobId: string) {
    assertSafeJobId(jobId);
    const response = await this.request(
      `conversions/jobs/${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: { "X-PDFMantra-Owner": ownerId },
      },
    );
    return parseJob(await response.json());
  }

  async cancelJob(ownerId: string, jobId: string) {
    assertSafeJobId(jobId);
    const response = await this.request(
      `conversions/jobs/${encodeURIComponent(jobId)}/cancel`,
      {
        method: "POST",
        headers: { "X-PDFMantra-Owner": ownerId },
      },
    );
    return parseJob(await response.json());
  }

  async downloadJob(ownerId: string, jobId: string) {
    assertSafeJobId(jobId);
    const response = await this.request(
      `conversions/jobs/${encodeURIComponent(jobId)}/download`,
      {
        method: "GET",
        headers: {
          "X-PDFMantra-Owner": ownerId,
          "X-PDFMantra-Record-Export": "once",
          Accept: "application/octet-stream",
        },
      },
    );
    return {
      body: await response.arrayBuffer(),
      mimeType:
        response.headers.get("content-type") ?? "application/octet-stream",
      fileName: safeOutputFileName(
        response.headers.get("x-pdfmantra-output-name"),
      ),
    };
  }
}

export function assertSafeJobId(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new ConversionJobIdError();
  }
}

function outputExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function hasMagic(bytes: Uint8Array, magic: readonly number[]) {
  return magic.every((value, index) => bytes[index] === value);
}

function expectedExtensions(format: ConversionDefinition["destinationFormat"]) {
  if (format === "jpg") return [".jpg", ".jpeg"] as const;
  if (format === "markdown") return [".md", ".markdown"] as const;
  return [`.${format}`] as const;
}

export function validateProviderOutput(
  conversion: ConversionDefinition,
  output: {
    readonly body: ArrayBuffer;
    readonly mimeType: string;
    readonly fileName: string;
  },
) {
  if (
    output.body.byteLength <= 0 ||
    output.body.byteLength > MAX_PROVIDER_OUTPUT_BYTES
  ) {
    throw new Error("INVALID_PROVIDER_OUTPUT: Provider output size is invalid.");
  }
  const mimeType = output.mimeType.split(";")[0]?.trim().toLowerCase();
  const expectedMime = conversion.expectedOutputMime
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  if (
    mimeType !== expectedMime &&
    mimeType !== "application/octet-stream"
  ) {
    throw new Error("INVALID_PROVIDER_OUTPUT: Provider output content type is invalid.");
  }
  const extension = outputExtension(output.fileName);
  if (
    !expectedExtensions(conversion.destinationFormat).some(
      (expected) => expected === extension,
    )
  ) {
    throw new Error("INVALID_PROVIDER_OUTPUT: Provider output filename is invalid.");
  }

  const header = new Uint8Array(output.body, 0, Math.min(8, output.body.byteLength));
  if (
    conversion.destinationFormat === "pdf" &&
    !hasMagic(header, [0x25, 0x50, 0x44, 0x46, 0x2d])
  ) {
    throw new Error("INVALID_PROVIDER_OUTPUT: Provider output is not a PDF.");
  }
  if (
    (conversion.destinationFormat === "docx" ||
      conversion.destinationFormat === "xlsx" ||
      conversion.destinationFormat === "pptx") &&
    !hasMagic(header, [0x50, 0x4b, 0x03, 0x04])
  ) {
    throw new Error("INVALID_PROVIDER_OUTPUT: Provider output is not an Open XML container.");
  }
  return output;
}

export function getConversionProvider(): ConversionProvider | null {
  const environment = getBackendEnvironment();
  if (
    !environment.processingApiBaseUrl ||
    !environment.processingApiToken
  ) {
    return null;
  }
  return new HttpConversionProvider(
    environment.processingApiBaseUrl,
    environment.processingApiToken,
  );
}
