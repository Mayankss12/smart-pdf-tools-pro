export type ToolGuide = {
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly steps: readonly string[];
  readonly example: string;
  readonly limitations: readonly string[];
  readonly faqs: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
};

export const TOOL_GUIDES = {
  "merge-pdf": {
    eyebrow: "MERGE PDF GUIDE",
    title: "Combine PDFs in the order you choose",
    introduction:
      "Use Merge PDF when several complete documents need to become one file. PDFMantra keeps the source pages in the order shown in the queue and rebuilds them into a single downloadable PDF.",
    steps: [
      "Add two or more valid PDF files.",
      "Drag files or use the Up and Down controls to set the final order.",
      "Review the selected files, then merge and download the result.",
    ],
    example:
      "Example: place a cover sheet first, an invoice second and supporting receipts last to create one submission-ready document.",
    limitations: [
      "Encrypted PDFs must be unlocked with the correct password before merging.",
      "Merging preserves pages; it does not reconcile duplicate form-field names or rewrite page content.",
    ],
    faqs: [
      {
        question: "Does merging reduce PDF quality?",
        answer:
          "The merge engine copies the existing PDF pages rather than converting them to screenshots, so text and vector content are preserved where the source allows it.",
      },
      {
        question: "Can I change the file order before merging?",
        answer:
          "Yes. Reorder the queue before processing; the downloaded PDF follows that visible order.",
      },
    ],
  },
  "compress-pdf": {
    eyebrow: "COMPRESS PDF GUIDE",
    title: "Choose quality preservation or stronger size reduction",
    introduction:
      "PDFMantra offers two different compression approaches because one method cannot safely optimize every PDF. Structural compression prioritizes document features, while scan compression prioritizes a smaller visual file.",
    steps: [
      "Upload a valid PDF and inspect the available method descriptions.",
      "Use Structural Compression to preserve selectable text, links, vectors and forms.",
      "Use Scan Compression only when stronger reduction is worth flattening interactive content.",
    ],
    example:
      "Example: use Structural Compression for a digital contract; consider Balanced Scan Compression for a scanned packet that is too large to email.",
    limitations: [
      "A target size is a processing goal, not a guaranteed final file size.",
      "Scan compression can flatten selectable text, links, form fields and vector artwork.",
      "Already-optimized PDFs may show only a modest reduction.",
    ],
    faqs: [
      {
        question: "Which compression mode should I use first?",
        answer:
          "Start with Structural Compression for normal digital PDFs. Move to Scan Compression only when the result is still too large and a flattened visual copy is acceptable.",
      },
      {
        question: "Will compression change the page size?",
        answer:
          "Structural compression preserves page dimensions. Scan compression recreates the page visuals at the selected quality profile while retaining the page layout.",
      },
    ],
  },
  "pdf-to-searchable-pdf": {
    eyebrow: "SEARCHABLE PDF GUIDE",
    title: "Add a searchable text layer to scanned pages",
    introduction:
      "OCR reads text from page images and places an invisible searchable layer over the original PDF visuals. The result can be searched and selected while keeping the scanned page appearance.",
    steps: [
      "Upload a scanned or image-based PDF.",
      "Choose the document language, scan type and quality profile.",
      "Run OCR, review the confidence summary and download the searchable PDF.",
    ],
    example:
      "Example: turn a scanned invoice archive into PDFs that can be searched by supplier name, invoice number or item text.",
    limitations: [
      "Accuracy depends on resolution, contrast, page rotation, language and print quality.",
      "Handwriting, decorative fonts and complex tables may require manual review.",
      "OCR adds searchable text; it does not recreate the scan as an editable Word layout.",
    ],
    faqs: [
      {
        question: "Does OCR change the original page image?",
        answer:
          "The searchable-PDF workflow preserves the original page visuals and adds a text layer for search and selection.",
      },
      {
        question: "Which language should I select?",
        answer:
          "Choose the main language printed in the document. Auto mode is useful for mixed English and Hindi pages but requires a larger language download.",
      },
    ],
  },
  "pdf-to-word": {
    eyebrow: "PDF TO WORD GUIDE",
    title: "Create an editable Word document from PDF text",
    introduction:
      "PDFMantra extracts native PDF text page by page and can use OCR on scan-like pages. The resulting DOCX is designed for editing, not for pretending that every fixed PDF layout can be reconstructed perfectly.",
    steps: [
      "Upload a valid PDF and leave OCR enabled when the document contains scans.",
      "Choose the most relevant OCR language and quality setting.",
      "Convert, open the DOCX offline and review complex pages before editing or sharing.",
    ],
    example:
      "Example: convert a text-heavy report into editable Word paragraphs, then correct headings and spacing in Word before reuse.",
    limitations: [
      "Complex columns, tables, embedded fonts and exact visual positioning may shift.",
      "Scanned text depends on OCR accuracy and may contain recognition mistakes.",
      "PDF is a fixed-page format, while Word reflows content; identical pagination is not guaranteed.",
    ],
    faqs: [
      {
        question: "Is the converted Word text editable?",
        answer:
          "Yes. The DOCX uses editable paragraphs for extracted text. It is not a page-image-only document.",
      },
      {
        question: "Why can an invoice layout change in Word?",
        answer:
          "Invoices often use individually positioned text, lines and cells. Word uses flowing document structures, so complex PDF geometry cannot always map to identical editable Word elements.",
      },
    ],
  },
} satisfies Record<string, ToolGuide>;
