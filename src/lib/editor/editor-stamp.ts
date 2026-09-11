export const EDITOR_STAMP_PRESETS = [
  "Approved",
  "Authorized",
  "Reviewed",
  "Received",
  "Paid",
  "Draft",
  "Confidential",
  "Rejected",
] as const;

export const EDITOR_STAMP_FORMATS = ["rectangle", "pill", "round"] as const;

export type EditorStampPreset = (typeof EDITOR_STAMP_PRESETS)[number];
export type EditorStampFormat = (typeof EDITOR_STAMP_FORMATS)[number];

export type EditorStampDefinition = {
  readonly preset: EditorStampPreset;
  readonly format: EditorStampFormat;
  readonly authorizedName: string;
  readonly date: string;
  readonly color: string;
};

export function sanitizeStampName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function normalizeStampDate(value: string) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function buildStampLines(definition: EditorStampDefinition) {
  const lines = [definition.preset.toUpperCase()];
  const authorizedName = sanitizeStampName(definition.authorizedName);
  const date = normalizeStampDate(definition.date);

  if (authorizedName) lines.push(`Authorized: ${authorizedName}`);
  if (date) lines.push(date);

  return lines;
}

export function getStampDefaultSize(format: EditorStampFormat) {
  return format === "round"
    ? { width: 150, height: 150 }
    : { width: 230, height: 86 };
}
