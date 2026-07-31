export type PdfEngineErrorCode =
  | "NO_FILE"
  | "INVALID_FILE"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "ENCRYPTED_OR_UNSUPPORTED"
  | "INVALID_PAGE_RANGE"
  | "PROCESSING_FAILED";

export class PdfEngineError extends Error {
  readonly code: PdfEngineErrorCode;

  constructor(code: PdfEngineErrorCode, message: string) {
    super(message);
    this.name = "PdfEngineError";
    this.code = code;
  }
}
