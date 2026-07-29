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

  const hostname = canonicalizeNetworkHostname(url.hostname);
  const forbidden =
    isLocalHostname(hostname) || isNonPublicIpAddress(hostname);

  if (forbidden) {
    return {
      allowed: false,
      reason: "Local, private, link-local, and internal network URLs are blocked.",
    } as const;
  }
  return { allowed: true, reason: null } as const;
}

export function canonicalizeNetworkHostname(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  return trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;
}

export function isLocalHostname(hostname: string) {
  const canonical = canonicalizeNetworkHostname(hostname);
  return (
    canonical === "localhost" ||
    canonical.endsWith(".localhost") ||
    canonical.endsWith(".local") ||
    canonical.endsWith(".internal") ||
    canonical.endsWith(".home") ||
    canonical.endsWith(".lan")
  );
}

function parseIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) =>
    /^\d{1,3}$/.test(part) ? Number(part) : Number.NaN,
  );
  return octets.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
  )
    ? octets
    : null;
}

function parseIpv6(value: string) {
  let source = canonicalizeNetworkHostname(value);
  const zoneIndex = source.indexOf("%");
  if (zoneIndex >= 0) source = source.slice(0, zoneIndex);

  const embeddedIpv4Match = source.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (embeddedIpv4Match) {
    const ipv4 = parseIpv4(embeddedIpv4Match[2]);
    if (!ipv4) return null;
    source = `${embeddedIpv4Match[1]}${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }

  if (!source.includes(":") || source.split("::").length > 2) return null;
  const [leftSource, rightSource = ""] = source.split("::");
  const left = leftSource ? leftSource.split(":") : [];
  const right = rightSource ? rightSource.split(":") : [];
  if (
    [...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/i.test(part))
  ) {
    return null;
  }
  const missing = 8 - left.length - right.length;
  if (
    (source.includes("::") && missing < 1) ||
    (!source.includes("::") && missing !== 0)
  ) {
    return null;
  }
  return [
    ...left.map((part) => Number.parseInt(part, 16)),
    ...Array.from({ length: missing }, () => 0),
    ...right.map((part) => Number.parseInt(part, 16)),
  ];
}

function isNonPublicIpv4(octets: readonly number[]) {
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isNonPublicIpAddress(value: string) {
  const canonical = canonicalizeNetworkHostname(value);
  const ipv4 = parseIpv4(canonical);
  if (ipv4) return isNonPublicIpv4(ipv4);

  const ipv6 = parseIpv6(canonical);
  if (!ipv6) return false;
  const [first, second, third, fourth, fifth, sixth, seventh, eighth] = ipv6;
  const isUnspecified = ipv6.every((part) => part === 0);
  const isLoopback =
    first === 0 &&
    second === 0 &&
    third === 0 &&
    fourth === 0 &&
    fifth === 0 &&
    sixth === 0 &&
    seventh === 0 &&
    eighth === 1;
  const isIpv4Mapped =
    first === 0 &&
    second === 0 &&
    third === 0 &&
    fourth === 0 &&
    fifth === 0 &&
    sixth === 0xffff;
  if (isIpv4Mapped) {
    return isNonPublicIpv4([
      seventh >> 8,
      seventh & 0xff,
      eighth >> 8,
      eighth & 0xff,
    ]);
  }

  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isMulticast = (first & 0xff00) === 0xff00;
  const isDocumentation = first === 0x2001 && second === 0x0db8;
  const isGlobalUnicast = (first & 0xe000) === 0x2000;
  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isMulticast ||
    isDocumentation ||
    !isGlobalUnicast
  );
}
