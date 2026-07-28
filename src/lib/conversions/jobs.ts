import { getBackendEnvironment } from "@/lib/backend/env";

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
  }) {
    const form = new FormData();
    form.set("conversionId", input.conversionId);
    if (input.file) form.set("file", input.file, input.file.name);
    if (input.sourceUrl) form.set("sourceUrl", input.sourceUrl);
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
    throw new Error("Invalid conversion job identifier.");
  }
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
