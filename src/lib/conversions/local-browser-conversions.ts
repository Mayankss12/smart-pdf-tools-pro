export const LOCAL_BROWSER_CONVERSION_IDS = [
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
] as const;

export type LocalBrowserConversionId =
  (typeof LOCAL_BROWSER_CONVERSION_IDS)[number];

export function isLocalBrowserConversionId(
  value: string,
): value is LocalBrowserConversionId {
  return LOCAL_BROWSER_CONVERSION_IDS.includes(
    value as LocalBrowserConversionId,
  );
}
