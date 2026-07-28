import type { ConversionDefinition } from "./registry";

const OFFICE_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const FORBIDDEN_OFFICE_EXTENSIONS = [".docm", ".xlsm", ".pptm", ".xlam"];

export class ConversionValidationError extends Error {
  readonly code:
    | "INVALID_TYPE"
    | "INVALID_MAGIC"
    | "EMPTY_FILE"
    | "FILE_TOO_LARGE"
    | "TOO_MANY_FILES"
    | "MACRO_ENABLED_NOT_ALLOWED";

  constructor(
    code: ConversionValidationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "ConversionValidationError";
    this.code = code;
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function getExtension(fileName: string) {
  const normalized = fileName.toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

export async function validateConversionFiles(
  conversion: ConversionDefinition,
  files: readonly File[],
) {
  if (!files.length) {
    throw new ConversionValidationError(
      "EMPTY_FILE",
      "Choose at least one source file.",
    );
  }
  if (files.length > conversion.maxFileCount) {
    throw new ConversionValidationError(
      "TOO_MANY_FILES",
      `This conversion accepts up to ${conversion.maxFileCount} file${conversion.maxFileCount === 1 ? "" : "s"} per run.`,
    );
  }

  for (const file of files) {
    const extension = getExtension(file.name);
    if (FORBIDDEN_OFFICE_EXTENSIONS.includes(extension)) {
      throw new ConversionValidationError(
        "MACRO_ENABLED_NOT_ALLOWED",
        "Macro-enabled Office files are not accepted.",
      );
    }
    if (!conversion.acceptedExtensions.includes(extension)) {
      throw new ConversionValidationError(
        "INVALID_TYPE",
        `${file.name} does not match the required ${conversion.sourceFormat.toUpperCase()} format.`,
      );
    }
    if (file.size <= 0) {
      throw new ConversionValidationError(
        "EMPTY_FILE",
        `${file.name} is empty.`,
      );
    }
    if (file.size > conversion.maxFileSize) {
      throw new ConversionValidationError(
        "FILE_TOO_LARGE",
        `${file.name} exceeds the ${Math.round(conversion.maxFileSize / 1024 / 1024)} MB limit.`,
      );
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (
      conversion.sourceFormat === "pdf" &&
      !startsWith(header, PDF_MAGIC)
    ) {
      throw new ConversionValidationError(
        "INVALID_MAGIC",
        `${file.name} does not begin with a valid PDF signature.`,
      );
    }
    if (
      (conversion.sourceFormat === "docx" ||
        conversion.sourceFormat === "xlsx" ||
        conversion.sourceFormat === "pptx") &&
      !startsWith(header, OFFICE_MAGIC)
    ) {
      throw new ConversionValidationError(
        "INVALID_MAGIC",
        `${file.name} is not a valid Open XML Office archive.`,
      );
    }
  }
}

export function validatePublicWebpageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { allowed: false, reason: "Enter a valid absolute URL." } as const;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      allowed: false,
      reason: "Only public HTTP and HTTPS URLs are allowed.",
    } as const;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const forbidden =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    /^(127|10)\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  return forbidden
    ? {
        allowed: false,
        reason: "Local, private, link-local, and internal network URLs are blocked.",
      }
    : { allowed: true, reason: null };
}
