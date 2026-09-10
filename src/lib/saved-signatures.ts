export const MAX_SAVED_SIGNATURES = 12;
export const MAX_SAVED_SIGNATURE_BYTES = 2 * 1024 * 1024;
export const SAVED_SIGNATURE_URL_TTL_SECONDS = 60 * 60;

export type SavedSignatureType = "typed" | "drawn" | "uploaded" | "initials";

export type SavedSignatureView = {
  readonly id: string;
  readonly label: string;
  readonly signatureType: SavedSignatureType;
  readonly text: string | null;
  readonly previewUrl: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: string;
};

export function sanitizeSignatureLabel(value: unknown) {
  if (typeof value !== "string") return "My signature";
  const label = value.trim().replace(/\s+/g, " ");
  return label.slice(0, 60) || "My signature";
}

export function isSavedSignatureType(value: unknown): value is SavedSignatureType {
  return value === "typed" || value === "drawn" || value === "uploaded" || value === "initials";
}

export function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

export function normalizeSignatureDimension(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : null;
}
