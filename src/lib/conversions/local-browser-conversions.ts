export const LOCAL_BROWSER_CONVERSION_IDS = [
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
] as const;

export type LocalBrowserConversionId =
  (typeof LOCAL_BROWSER_CONVERSION_IDS)[number];

const LOCAL_BROWSER_CONVERSION_DESCRIPTIONS: Record<
  LocalBrowserConversionId,
  string
> = {
  "pdf-to-word": "Extract PDF text into an editable Word document with optional OCR.",
  "pdf-to-excel": "Export PDF text into one Excel worksheet per page.",
  "pdf-to-powerpoint": "Turn every PDF page into a visual PowerPoint slide.",
  "docx-to-pdf": "Convert readable Word text and paragraphs into a clean PDF.",
  "xlsx-to-pdf": "Convert worksheet cell values into a landscape PDF.",
  "pptx-to-pdf": "Convert readable slide text into a page-by-page PDF.",
};

export function isLocalBrowserConversionId(
  value: string,
): value is LocalBrowserConversionId {
  return LOCAL_BROWSER_CONVERSION_IDS.includes(
    value as LocalBrowserConversionId,
  );
}

export function getLocalBrowserConversionDescription(id: string) {
  return isLocalBrowserConversionId(id)
    ? LOCAL_BROWSER_CONVERSION_DESCRIPTIONS[id]
    : null;
}
