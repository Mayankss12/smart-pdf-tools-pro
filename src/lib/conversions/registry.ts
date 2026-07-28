export type ConversionFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "txt"
  | "html"
  | "markdown"
  | "csv"
  | "jpg"
  | "png"
  | "webp"
  | "heic"
  | "url";

export type ConversionProcessingMode = "client" | "server" | "provider";
export type ConversionStatus =
  | "available"
  | "backend-required"
  | "coming-soon"
  | "maintenance"
  | "disabled";
export type ConversionPreservation = "yes" | "partial" | "no";
export type ConversionAccess = "free" | "pro" | "admin-only";

export type ConversionCapabilityKey =
  | "browser-pdf-render"
  | "browser-pdf-text"
  | "browser-pdf-ocr"
  | "browser-image-pdf"
  | "browser-text-pdf"
  | "browser-structured-pdf"
  | "document-conversion-worker"
  | "office-rendering-worker"
  | "heic-decoder"
  | "secure-webpage-renderer";

export interface ConversionDefinition {
  readonly id: string;
  readonly sourceFormat: ConversionFormat;
  readonly destinationFormat: ConversionFormat;
  readonly title: string;
  readonly description: string;
  readonly route: `/tools/${string}`;
  readonly acceptedMimeTypes: readonly string[];
  readonly acceptedExtensions: readonly string[];
  readonly maxFileSize: number;
  readonly maxFileCount: number;
  readonly processingMode: ConversionProcessingMode;
  readonly capabilityKey: ConversionCapabilityKey;
  readonly status: ConversionStatus;
  readonly disabledReason: string | null;
  readonly supportsBatch: boolean;
  readonly supportsProgress: boolean;
  readonly supportsCancellation: boolean;
  readonly preservesText: ConversionPreservation;
  readonly preservesLayout: ConversionPreservation;
  readonly preservesImages: ConversionPreservation;
  readonly preservesTables: ConversionPreservation;
  readonly preservesLinks: ConversionPreservation;
  readonly expectedOutputMime: string;
  readonly entitlementToolKey: string;
  readonly analyticsEvent: `conversion_${string}`;
  readonly access: ConversionAccess;
  readonly dailyLimit: number | null;
  readonly maxPageCount: number | null;
  readonly batchLimit: number;
  readonly privacyMessage: string;
  readonly qualityNotice: string;
}

const BROWSER_PRIVACY = "Your files stay in your browser.";
const BACKEND_PRIVACY =
  "When enabled, your file is sent to the configured private processing provider. Output access is authenticated and expires according to the provider job policy.";
const MB = 1024 * 1024;

function clientConversion(
  definition: Omit<
    ConversionDefinition,
    | "processingMode"
    | "status"
    | "disabledReason"
    | "access"
    | "dailyLimit"
    | "privacyMessage"
  >,
): ConversionDefinition {
  return {
    ...definition,
    processingMode: "client",
    status: "available",
    disabledReason: null,
    access: "free",
    dailyLimit: null,
    privacyMessage: BROWSER_PRIVACY,
  };
}

function backendConversion(
  definition: Omit<
    ConversionDefinition,
    | "processingMode"
    | "status"
    | "disabledReason"
    | "access"
    | "dailyLimit"
    | "privacyMessage"
  > & {
    readonly disabledReason: string;
  },
): ConversionDefinition {
  return {
    ...definition,
    processingMode: "provider",
    status: "backend-required",
    access: "pro",
    dailyLimit: null,
    privacyMessage: BACKEND_PRIVACY,
  };
}

const pdfInput = {
  acceptedMimeTypes: ["application/pdf"],
  acceptedExtensions: [".pdf"],
  maxFileSize: 80 * MB,
  maxFileCount: 1,
  maxPageCount: 500,
  batchLimit: 1,
} as const;

const imageInput = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxFileSize: 40 * MB,
  maxFileCount: 80,
  maxPageCount: null,
  batchLimit: 80,
} as const;

export const CONVERSION_REGISTRY = [
  backendConversion({
    ...pdfInput,
    id: "pdf-to-word",
    sourceFormat: "pdf",
    destinationFormat: "docx",
    title: "PDF to Word",
    description: "Convert PDF content into a valid editable DOCX document.",
    route: "/tools/pdf-to-word",
    capabilityKey: "document-conversion-worker",
    disabledReason:
      "A DOCX writer/conversion worker is not configured. PDFMantra will not rename text or HTML as a Word document.",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "yes",
    preservesLayout: "partial",
    preservesImages: "partial",
    preservesTables: "partial",
    preservesLinks: "partial",
    expectedOutputMime:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    entitlementToolKey: "pdf-to-word",
    analyticsEvent: "conversion_pdf_to_word",
    qualityNotice:
      "Editable reconstruction requires a real DOCX renderer; complex PDF layout may differ.",
  }),
  backendConversion({
    ...pdfInput,
    id: "pdf-to-excel",
    sourceFormat: "pdf",
    destinationFormat: "xlsx",
    title: "PDF to Excel",
    description: "Extract confidently detected PDF tables into a valid XLSX workbook.",
    route: "/tools/pdf-to-excel",
    capabilityKey: "document-conversion-worker",
    disabledReason:
      "A table-detection and XLSX-writing worker is not configured. Best-effort plain text is not presented as a spreadsheet.",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "partial",
    preservesLayout: "no",
    preservesImages: "no",
    preservesTables: "partial",
    preservesLinks: "no",
    expectedOutputMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    entitlementToolKey: "pdf-to-excel",
    analyticsEvent: "conversion_pdf_to_excel",
    qualityNotice:
      "Best for clearly ruled tabular PDFs; merged cells and arbitrary prose cannot be reconstructed reliably.",
  }),
  backendConversion({
    ...pdfInput,
    id: "pdf-to-powerpoint",
    sourceFormat: "pdf",
    destinationFormat: "pptx",
    title: "PDF to PowerPoint",
    description: "Create a valid PowerPoint deck from PDF pages.",
    route: "/tools/pdf-to-powerpoint",
    capabilityKey: "document-conversion-worker",
    disabledReason:
      "A PPTX writer is not configured. PDFMantra will not return page images with a renamed .pptx extension.",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "partial",
    preservesLayout: "partial",
    preservesImages: "yes",
    preservesTables: "partial",
    preservesLinks: "partial",
    expectedOutputMime:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    entitlementToolKey: "pdf-to-powerpoint",
    analyticsEvent: "conversion_pdf_to_powerpoint",
    qualityNotice:
      "Visual mode can preserve appearance as slide images; editable reconstruction requires a capable provider.",
  }),
  clientConversion({
    ...pdfInput,
    id: "pdf-to-text",
    sourceFormat: "pdf",
    destinationFormat: "txt",
    title: "PDF to Text",
    description: "Extract native or OCR text page-by-page into UTF-8 plain text.",
    route: "/tools/pdf-to-text",
    capabilityKey: "browser-pdf-text",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "yes",
    preservesLayout: "no",
    preservesImages: "no",
    preservesTables: "no",
    preservesLinks: "no",
    expectedOutputMime: "text/plain;charset=utf-8",
    entitlementToolKey: "pdf-to-text",
    analyticsEvent: "conversion_pdf_to_text",
    qualityNotice:
      "Plain text preserves page boundaries, not the PDF's visual layout. OCR accuracy depends on scan quality.",
  }),
  clientConversion({
    ...pdfInput,
    id: "pdf-to-html",
    sourceFormat: "pdf",
    destinationFormat: "html",
    title: "PDF to HTML",
    description: "Generate sanitized, script-free HTML sections from PDF text.",
    route: "/tools/pdf-to-html",
    capabilityKey: "browser-pdf-text",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "yes",
    preservesLayout: "partial",
    preservesImages: "no",
    preservesTables: "no",
    preservesLinks: "partial",
    expectedOutputMime: "text/html;charset=utf-8",
    entitlementToolKey: "pdf-to-html",
    analyticsEvent: "conversion_pdf_to_html",
    qualityNotice:
      "Generated HTML preserves page sections and text flow; complex columns and typography may differ.",
  }),
  ...(["jpg", "png", "webp"] as const).map((format) =>
    clientConversion({
      ...pdfInput,
      id: `pdf-to-${format}`,
      sourceFormat: "pdf",
      destinationFormat: format,
      title: `PDF to ${format.toUpperCase()}`,
      description: `Render selected PDF pages as ${format.toUpperCase()} images.`,
      route: `/tools/pdf-to-${format}`,
      capabilityKey: "browser-pdf-render",
      supportsBatch: false,
      supportsProgress: true,
      supportsCancellation: true,
      preservesText: "no",
      preservesLayout: "yes",
      preservesImages: "yes",
      preservesTables: "yes",
      preservesLinks: "no",
      expectedOutputMime:
        format === "jpg" ? "image/jpeg" : `image/${format}`,
      entitlementToolKey: `pdf-to-${format}`,
      analyticsEvent: `conversion_pdf_to_${format}`,
      qualityNotice:
        "Each output is a rendered page image; PDF text and links are not retained as interactive content.",
    }),
  ),
  clientConversion({
    ...pdfInput,
    id: "pdf-to-images",
    sourceFormat: "pdf",
    destinationFormat: "png",
    title: "PDF to Images",
    description: "Render selected PDF pages as PNG, JPG, or WebP files.",
    route: "/tools/pdf-to-images",
    capabilityKey: "browser-pdf-render",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "no",
    preservesLayout: "yes",
    preservesImages: "yes",
    preservesTables: "yes",
    preservesLinks: "no",
    expectedOutputMime: "application/zip",
    entitlementToolKey: "pdf-to-images",
    analyticsEvent: "conversion_pdf_to_images",
    qualityNotice:
      "Rendered images preserve appearance but do not retain selectable text or interactive PDF links.",
  }),
  clientConversion({
    ...pdfInput,
    id: "pdf-to-searchable-pdf",
    sourceFormat: "pdf",
    destinationFormat: "pdf",
    title: "PDF to Searchable PDF",
    description: "Preserve original PDF pages and add an invisible OCR text layer.",
    route: "/tools/ocr",
    capabilityKey: "browser-pdf-ocr",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "yes",
    preservesLayout: "yes",
    preservesImages: "yes",
    preservesTables: "partial",
    preservesLinks: "partial",
    expectedOutputMime: "application/pdf",
    entitlementToolKey: "ocr",
    analyticsEvent: "conversion_pdf_to_searchable_pdf",
    qualityNotice:
      "Original page visuals are preserved. Search accuracy depends on language selection and scan quality.",
  }),
  ...(["jpg", "png", "webp"] as const).map((format) =>
    clientConversion({
      ...imageInput,
      acceptedMimeTypes: [
        format === "jpg" ? "image/jpeg" : `image/${format}`,
      ],
      acceptedExtensions:
        format === "jpg" ? [".jpg", ".jpeg"] : [`.${format}`],
      id: `${format}-to-pdf`,
      sourceFormat: format,
      destinationFormat: "pdf",
      title: `${format.toUpperCase()} to PDF`,
      description: `Convert ordered ${format.toUpperCase()} images into a PDF.`,
      route: `/tools/${format}-to-pdf`,
      capabilityKey: "browser-image-pdf",
      supportsBatch: true,
      supportsProgress: true,
      supportsCancellation: true,
      preservesText: "no",
      preservesLayout: "yes",
      preservesImages: "yes",
      preservesTables: "no",
      preservesLinks: "no",
      expectedOutputMime: "application/pdf",
      entitlementToolKey: `${format}-to-pdf`,
      analyticsEvent: `conversion_${format}_to_pdf`,
      qualityNotice:
        "Images are placed in queue order. OCR can optionally add searchable text without changing appearance.",
    }),
  ),
  clientConversion({
    ...imageInput,
    id: "images-to-pdf",
    sourceFormat: "jpg",
    destinationFormat: "pdf",
    title: "Images to PDF",
    description: "Combine JPG, PNG, and WebP images into one ordered PDF.",
    route: "/tools/images-to-pdf",
    capabilityKey: "browser-image-pdf",
    supportsBatch: true,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "no",
    preservesLayout: "yes",
    preservesImages: "yes",
    preservesTables: "no",
    preservesLinks: "no",
    expectedOutputMime: "application/pdf",
    entitlementToolKey: "images-to-pdf",
    analyticsEvent: "conversion_images_to_pdf",
    qualityNotice:
      "Image appearance and queue order are preserved; optional OCR adds searchable text.",
  }),
  backendConversion({
    id: "heic-to-pdf",
    sourceFormat: "heic",
    destinationFormat: "pdf",
    title: "HEIC to PDF",
    description: "Decode HEIC/HEIF photos and convert them to PDF.",
    route: "/tools/heic-to-pdf",
    acceptedMimeTypes: ["image/heic", "image/heif"],
    acceptedExtensions: [".heic", ".heif"],
    maxFileSize: 40 * MB,
    maxFileCount: 40,
    capabilityKey: "heic-decoder",
    disabledReason:
      "No production-safe HEIC decoder is installed. Configure the conversion worker with HEIC/HEIF decoding support.",
    supportsBatch: true,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "no",
    preservesLayout: "yes",
    preservesImages: "yes",
    preservesTables: "no",
    preservesLinks: "no",
    expectedOutputMime: "application/pdf",
    entitlementToolKey: "heic-to-pdf",
    analyticsEvent: "conversion_heic_to_pdf",
    qualityNotice:
      "EXIF orientation and color profiles must be normalized by the configured decoder.",
    maxPageCount: null,
    batchLimit: 40,
  }),
  clientConversion({
    id: "txt-to-pdf",
    sourceFormat: "txt",
    destinationFormat: "pdf",
    title: "Text to PDF",
    description: "Convert UTF-8 text into a selectable Unicode PDF.",
    route: "/tools/text-to-pdf",
    acceptedMimeTypes: ["text/plain"],
    acceptedExtensions: [".txt"],
    maxFileSize: 5 * MB,
    maxFileCount: 1,
    capabilityKey: "browser-text-pdf",
    supportsBatch: false,
    supportsProgress: false,
    supportsCancellation: false,
    preservesText: "yes",
    preservesLayout: "partial",
    preservesImages: "no",
    preservesTables: "no",
    preservesLinks: "no",
    expectedOutputMime: "application/pdf",
    entitlementToolKey: "text-to-pdf",
    analyticsEvent: "conversion_txt_to_pdf",
    qualityNotice:
      "Plain text wrapping and page breaks are preserved; unsupported glyphs receive visible fallbacks.",
    maxPageCount: null,
    batchLimit: 1,
  }),
  ...(["markdown", "html", "csv"] as const).map((format) =>
    clientConversion({
      id: `${format}-to-pdf`,
      sourceFormat: format,
      destinationFormat: "pdf",
      title: `${format === "markdown" ? "Markdown" : format.toUpperCase()} to PDF`,
      description: `Convert safe ${format.toUpperCase()} content into a selectable PDF.`,
      route: `/tools/${format}-to-pdf`,
      acceptedMimeTypes:
        format === "markdown"
          ? ["text/markdown", "text/plain"]
          : format === "html"
            ? ["text/html"]
            : ["text/csv", "text/plain"],
      acceptedExtensions:
        format === "markdown"
          ? [".md", ".markdown"]
          : [`.${format}`],
      maxFileSize: 5 * MB,
      maxFileCount: 1,
      capabilityKey: "browser-structured-pdf",
      supportsBatch: false,
      supportsProgress: true,
      supportsCancellation: false,
      preservesText: "yes",
      preservesLayout: "partial",
      preservesImages: "no",
      preservesTables: "partial",
      preservesLinks: format === "csv" ? "no" : "partial",
      expectedOutputMime: "application/pdf",
      entitlementToolKey: `${format}-to-pdf`,
      analyticsEvent: `conversion_${format}_to_pdf`,
      qualityNotice:
        format === "html"
          ? "Scripts, unsafe URLs, external resources, and unsupported CSS are removed."
          : format === "markdown"
            ? "Raw executable HTML is treated as text; print-safe document structures are supported."
            : "CSV delimiter and columns are detected; wide tables may use landscape pages.",
      maxPageCount: null,
      batchLimit: 1,
    }),
  ),
  ...(["docx", "xlsx", "pptx"] as const).map((format) =>
    backendConversion({
      id: `${format}-to-pdf`,
      sourceFormat: format,
      destinationFormat: "pdf",
      title: `${format === "docx" ? "Word" : format === "xlsx" ? "Excel" : "PowerPoint"} to PDF`,
      description: `Render a valid ${format.toUpperCase()} file into a PDF using an isolated document worker.`,
      route: `/tools/${format === "docx" ? "word" : format === "xlsx" ? "excel" : "powerpoint"}-to-pdf`,
      acceptedMimeTypes: [
        format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      acceptedExtensions: [`.${format}`],
      maxFileSize: 50 * MB,
      maxFileCount: 1,
      capabilityKey: "office-rendering-worker",
      disabledReason:
        "A production LibreOffice or approved document-rendering worker is not configured. Browser previews are not accurate Office-to-PDF conversion.",
      supportsBatch: false,
      supportsProgress: true,
      supportsCancellation: true,
      preservesText: "yes",
      preservesLayout: "partial",
      preservesImages: "yes",
      preservesTables: "yes",
      preservesLinks: "partial",
      expectedOutputMime: "application/pdf",
      entitlementToolKey: `${format}-to-pdf`,
      analyticsEvent: `conversion_${format}_to_pdf`,
      qualityNotice:
        "Output fidelity depends on the configured renderer and availability of the source document's fonts.",
      maxPageCount: null,
      batchLimit: 1,
    }),
  ),
  backendConversion({
    id: "webpage-to-pdf",
    sourceFormat: "url",
    destinationFormat: "pdf",
    title: "Webpage to PDF",
    description: "Render an approved public webpage through an isolated browser worker.",
    route: "/tools/webpage-to-pdf",
    acceptedMimeTypes: [],
    acceptedExtensions: [],
    maxFileSize: 0,
    maxFileCount: 0,
    capabilityKey: "secure-webpage-renderer",
    disabledReason:
      "A hardened webpage renderer with SSRF protection, private-network blocking, DNS pinning, and isolated navigation is not configured.",
    supportsBatch: false,
    supportsProgress: true,
    supportsCancellation: true,
    preservesText: "yes",
    preservesLayout: "partial",
    preservesImages: "partial",
    preservesTables: "yes",
    preservesLinks: "yes",
    expectedOutputMime: "application/pdf",
    entitlementToolKey: "webpage-to-pdf",
    analyticsEvent: "conversion_webpage_to_pdf",
    qualityNotice:
      "Authenticated pages, local addresses, internal networks, file URLs, and unsafe protocols are never accepted.",
    maxPageCount: null,
    batchLimit: 1,
  }),
] satisfies readonly ConversionDefinition[];

export type ConversionId = (typeof CONVERSION_REGISTRY)[number]["id"];

export function getConversionById(id: string) {
  return CONVERSION_REGISTRY.find((conversion) => conversion.id === id);
}

export function getConversionByRoute(route: string) {
  return CONVERSION_REGISTRY.find((conversion) => conversion.route === route);
}

export function getConversionsFromPdf() {
  return CONVERSION_REGISTRY.filter(
    (conversion) =>
      conversion.sourceFormat === "pdf" &&
      conversion.id !== "pdf-to-searchable-pdf",
  );
}

export function getConversionsToPdf() {
  return CONVERSION_REGISTRY.filter(
    (conversion) => conversion.destinationFormat === "pdf",
  );
}

export function isConversionAvailable(
  conversion: ConversionDefinition,
  enabledCapabilities: ReadonlySet<ConversionCapabilityKey>,
) {
  if (conversion.status !== "available") {
    return enabledCapabilities.has(conversion.capabilityKey);
  }
  return true;
}
