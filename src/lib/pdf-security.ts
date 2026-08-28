import { createPdfFileName, validatePdfFile } from "@/lib/pdf-engine";

export const PDF_SECURITY_MAX_SIZE_MB = 50;
export const PDF_SECURITY_MIN_PASSWORD_LENGTH = 8;
export const PDF_SECURITY_MAX_PASSWORD_LENGTH = 64;
export const PDF_SECURITY_MAX_PASSWORD_BYTES = 127;

export type PdfSecurityMode = "protect" | "unlock";

export type PdfSecurityPermissions = {
  readonly allowPrinting: boolean;
  readonly allowCopying: boolean;
  readonly allowEditing: boolean;
};

export type PdfSecurityErrorCode =
  | "ALREADY_ENCRYPTED"
  | "NOT_ENCRYPTED"
  | "WRONG_PASSWORD"
  | "INVALID_PASSWORD"
  | "INVALID_PDF"
  | "OUTPUT_VERIFICATION_FAILED"
  | "PROCESSING_FAILED"
  | "CANCELLED"
  | "TIMEOUT";

export class PdfSecurityError extends Error {
  readonly code: PdfSecurityErrorCode;

  constructor(code: PdfSecurityErrorCode, message: string) {
    super(message);
    this.name = "PdfSecurityError";
    this.code = code;
  }
}

export type PdfSecurityWorkerRequest =
  | {
      readonly id: string;
      readonly operation: "protect";
      readonly input: ArrayBuffer;
      readonly password: string;
      readonly permissions: PdfSecurityPermissions;
    }
  | {
      readonly id: string;
      readonly operation: "unlock";
      readonly input: ArrayBuffer;
      readonly password: string;
    };

export type PdfSecurityWorkerResponse =
  | {
      readonly id: string;
      readonly type: "progress";
      readonly progress: number;
      readonly message: string;
    }
  | {
      readonly id: string;
      readonly type: "success";
      readonly output: ArrayBuffer;
      readonly outputSize: number;
      readonly encryptionMethod: string | null;
    }
  | {
      readonly id: string;
      readonly type: "error";
      readonly code: PdfSecurityErrorCode;
      readonly message: string;
    };

export type PdfSecurityProgress = {
  readonly progress: number;
  readonly message: string;
};

export type PdfSecurityResult = {
  readonly bytes: Uint8Array;
  readonly blob: Blob;
  readonly fileName: string;
  readonly outputSize: number;
  readonly encryptionMethod: string | null;
};

const DIGITAL_SIGNATURE_MARKERS = [
  new TextEncoder().encode("/ByteRange"),
  new TextEncoder().encode("/Type/Sig"),
  new TextEncoder().encode("/Type /Sig"),
] as const;

function includesBytes(bytes: Uint8Array, marker: Uint8Array) {
  if (marker.length > bytes.length) return false;

  outer: for (let index = 0; index <= bytes.length - marker.length; index += 1) {
    for (let markerIndex = 0; markerIndex < marker.length; markerIndex += 1) {
      if (bytes[index + markerIndex] !== marker[markerIndex]) continue outer;
    }
    return true;
  }

  return false;
}

export function hasPdfDigitalSignatureMarker(bytes: Uint8Array) {
  return DIGITAL_SIGNATURE_MARKERS.some((marker) => includesBytes(bytes, marker));
}

export function validateProtectPassword(password: string) {
  const normalizedLength = Array.from(password).length;
  const encodedLength = new TextEncoder().encode(password).length;

  if (normalizedLength < PDF_SECURITY_MIN_PASSWORD_LENGTH) {
    throw new PdfSecurityError(
      "INVALID_PASSWORD",
      `Use at least ${PDF_SECURITY_MIN_PASSWORD_LENGTH} characters for the open password.`,
    );
  }

  if (normalizedLength > PDF_SECURITY_MAX_PASSWORD_LENGTH) {
    throw new PdfSecurityError(
      "INVALID_PASSWORD",
      `Use no more than ${PDF_SECURITY_MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  if (encodedLength > PDF_SECURITY_MAX_PASSWORD_BYTES) {
    throw new PdfSecurityError(
      "INVALID_PASSWORD",
      "This password is too long after Unicode encoding. Use a shorter password.",
    );
  }

  if (password.includes("\0")) {
    throw new PdfSecurityError(
      "INVALID_PASSWORD",
      "The password cannot contain a null character.",
    );
  }
}

export function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "Not set" } as const;

  let score = 0;
  if (Array.from(password).length >= 8) score += 1;
  if (Array.from(password).length >= 12) score += 1;
  if (/[a-z]/u.test(password) && /[A-Z]/u.test(password)) score += 1;
  if (/\d/u.test(password)) score += 1;
  if (/[^\p{L}\p{N}]/u.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak" } as const;
  if (score <= 3) return { score: 2, label: "Fair" } as const;
  return { score: 3, label: "Strong" } as const;
}

export function validatePdfSecurityFile(file: File) {
  validatePdfFile(file, { maxSizeMb: PDF_SECURITY_MAX_SIZE_MB });
}

export function createPdfSecurityFileName(mode: PdfSecurityMode, sourceName: string) {
  return createPdfFileName(mode === "protect" ? "protected" : "unlocked", sourceName);
}

export function getPdfSecurityErrorMessage(error: unknown, mode: PdfSecurityMode) {
  if (error instanceof PdfSecurityError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") {
    return `${mode === "protect" ? "Protection" : "Unlocking"} cancelled.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return mode === "protect"
    ? "Unable to protect this PDF. It may be damaged, encrypted, or unsupported."
    : "Unable to unlock this PDF. Check the password and confirm the file is supported.";
}
