import type { ConversionDefinition } from "./registry";

const OFFICE_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const FORBIDDEN_OFFICE_EXTENSIONS = [".docm", ".xlsm", ".pptm", ".xlam"];
const HEIC_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
] as const;

export class ConversionValidationError extends Error {
  readonly code:
    | "INVALID_TYPE"
    | "INVALID_MAGIC"
    | "EMPTY_FILE"
    | "FILE_TOO_LARGE"
    | "TOO_MANY_FILES"
    | "MACRO_ENABLED_NOT_ALLOWED"
    | "INVALID_OFFICE_ARCHIVE";

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

function isHeicHeader(bytes: Uint8Array) {
  if (
    bytes.length < 12 ||
    String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp"
  ) {
    return false;
  }
  const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
  return HEIC_BRANDS.some((candidate) => candidate === brand);
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
    if (
      file.type &&
      file.type !== "application/octet-stream" &&
      conversion.acceptedMimeTypes.length > 0 &&
      !conversion.acceptedMimeTypes.includes(file.type.toLowerCase())
    ) {
      throw new ConversionValidationError(
        "INVALID_TYPE",
        `${file.name} has an unexpected content type.`,
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
    if (conversion.sourceFormat === "heic" && !isHeicHeader(header)) {
      throw new ConversionValidationError(
        "INVALID_MAGIC",
        `${file.name} is not a recognized HEIC or HEIF image.`,
      );
    }
    if (
      conversion.sourceFormat === "docx" ||
      conversion.sourceFormat === "xlsx" ||
      conversion.sourceFormat === "pptx"
    ) {
      const directoryStart = Math.max(0, file.size - 4 * 1024 * 1024);
      const directoryText = new TextDecoder("windows-1252").decode(
        await file.slice(directoryStart).arrayBuffer(),
      );
      if (directoryText.includes("vbaProject.bin")) {
        throw new ConversionValidationError(
          "MACRO_ENABLED_NOT_ALLOWED",
          "Office archives containing VBA projects are not accepted.",
        );
      }
      const requiredEntry =
        conversion.sourceFormat === "docx"
          ? "word/document.xml"
          : conversion.sourceFormat === "xlsx"
            ? "xl/workbook.xml"
            : "ppt/presentation.xml";
      if (
        !directoryText.includes("[Content_Types].xml") ||
        !directoryText.includes(requiredEntry)
      ) {
        throw new ConversionValidationError(
          "INVALID_OFFICE_ARCHIVE",
          `${file.name} does not contain the required Open XML document structure.`,
        );
      }
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
