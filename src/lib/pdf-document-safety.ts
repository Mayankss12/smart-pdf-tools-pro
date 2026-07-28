import {
  PDFDocument,
  PDFName,
  PDFSignature,
  type PDFDocument as PdfLibDocument,
} from "pdf-lib";

import { PdfEngineError } from "./pdf-errors";

export type PdfCompatibilityFeature =
  | "acroform"
  | "digital-signature"
  | "outlines"
  | "attachments"
  | "portfolio"
  | "xmp"
  | "interactive-annotations";

export type PdfCompatibilityIssue = {
  readonly feature: PdfCompatibilityFeature;
  readonly severity: "warning" | "critical";
  readonly message: string;
};

export type PdfCompatibilityReport = {
  readonly fileName: string;
  readonly pageCount: number;
  readonly hasAcroForm: boolean;
  readonly hasDigitalSignature: boolean;
  readonly hasOutlines: boolean;
  readonly hasAttachments: boolean;
  readonly hasPortfolio: boolean;
  readonly hasXmpMetadata: boolean;
  readonly hasInteractiveAnnotations: boolean;
  readonly issues: readonly PdfCompatibilityIssue[];
};

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const RAW_SIGNATURE_MARKERS = ["/ByteRange", "/Type/Sig", "/Type /Sig"];

function bytesStartWithPdfMagic(bytes: Uint8Array) {
  return PDF_MAGIC.every((value, index) => bytes[index] === value);
}

function decodePdfMarkers(bytes: Uint8Array) {
  const decoder = new TextDecoder("latin1");
  return decoder.decode(bytes);
}

function rawPdfContains(bytes: Uint8Array, markers: readonly string[]) {
  const source = decodePdfMarkers(bytes);
  return markers.some((marker) => source.includes(marker));
}

function getPageAnnotationPresence(pdf: PdfLibDocument) {
  return pdf.getPages().some((page) => {
    const annotations = page.node.get(PDFName.of("Annots"));
    return Boolean(annotations);
  });
}

function getFormFacts(pdf: PdfLibDocument) {
  const hasAcroForm = Boolean(pdf.catalog.getAcroForm());
  if (!hasAcroForm) {
    return { hasAcroForm: false, hasSignatureField: false };
  }

  try {
    const fields = pdf.getForm().getFields();
    return {
      hasAcroForm: true,
      hasSignatureField: fields.some((field) => field instanceof PDFSignature),
    };
  } catch {
    return { hasAcroForm: true, hasSignatureField: false };
  }
}

export async function readValidatedPdfBytes(
  file: File,
  maxSizeMb = 80,
): Promise<Uint8Array> {
  if (file.size <= 0) {
    throw new PdfEngineError("EMPTY_FILE", "This file is empty. Please choose another PDF.");
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new PdfEngineError(
      "FILE_TOO_LARGE",
      `This PDF is too large for browser processing. Maximum allowed size is ${maxSizeMb} MB.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytesStartWithPdfMagic(bytes)) {
    throw new PdfEngineError(
      "INVALID_FILE_TYPE",
      "This file does not begin with a valid PDF signature (%PDF-).",
    );
  }

  return bytes;
}

export async function inspectPdfCompatibility(
  file: File,
): Promise<PdfCompatibilityReport> {
  const bytes = await readValidatedPdfBytes(file);
  let pdf: PdfLibDocument;

  try {
    pdf = await PDFDocument.load(bytes);
  } catch {
    throw new PdfEngineError(
      "ENCRYPTED_OR_UNSUPPORTED",
      "This PDF could not be opened. It may be password-protected, encrypted, damaged, or unsupported.",
    );
  }

  const formFacts = getFormFacts(pdf);
  const hasDigitalSignature =
    formFacts.hasSignatureField || rawPdfContains(bytes, RAW_SIGNATURE_MARKERS);
  const hasOutlines = Boolean(pdf.catalog.get(PDFName.of("Outlines")));
  const hasAttachments =
    rawPdfContains(bytes, ["/EmbeddedFiles"]) ||
    Boolean(pdf.catalog.get(PDFName.of("Names")));
  const hasPortfolio =
    rawPdfContains(bytes, ["/Collection"]) ||
    Boolean(pdf.catalog.get(PDFName.of("Collection")));
  const hasXmpMetadata =
    rawPdfContains(bytes, ["/Type/Metadata", "/Type /Metadata"]) ||
    Boolean(pdf.catalog.get(PDFName.of("Metadata")));
  const hasInteractiveAnnotations = getPageAnnotationPresence(pdf);
  const issues: PdfCompatibilityIssue[] = [];

  if (hasDigitalSignature) {
    issues.push({
      feature: "digital-signature",
      severity: "critical",
      message:
        "This PDF contains a digital-signature field or signature byte range. Any modification invalidates existing signatures.",
    });
  }
  if (formFacts.hasAcroForm) {
    issues.push({
      feature: "acroform",
      severity: "warning",
      message:
        "Interactive form fields may be removed or become non-interactive when pages are rebuilt.",
    });
  }
  if (hasOutlines) {
    issues.push({
      feature: "outlines",
      severity: "warning",
      message: "Bookmarks and document outlines are not preserved by page-copy rebuilding.",
    });
  }
  if (hasAttachments) {
    issues.push({
      feature: "attachments",
      severity: "warning",
      message: "Embedded files and document attachments are not preserved by page-copy rebuilding.",
    });
  }
  if (hasPortfolio) {
    issues.push({
      feature: "portfolio",
      severity: "warning",
      message: "PDF portfolio/package structure is not preserved by page-copy rebuilding.",
    });
  }
  if (hasXmpMetadata) {
    issues.push({
      feature: "xmp",
      severity: "warning",
      message:
        "Basic document properties are preserved, but the original XMP metadata packet may not be retained.",
    });
  }
  if (hasInteractiveAnnotations) {
    issues.push({
      feature: "interactive-annotations",
      severity: "warning",
      message:
        "Ordinary page annotations are copied with their pages, but unsupported interactive actions may not survive.",
    });
  }

  return {
    fileName: file.name,
    pageCount: pdf.getPageCount(),
    hasAcroForm: formFacts.hasAcroForm,
    hasDigitalSignature,
    hasOutlines,
    hasAttachments,
    hasPortfolio,
    hasXmpMetadata,
    hasInteractiveAnnotations,
    issues,
  };
}

export function buildPdfCompatibilityWarning(
  reports: readonly PdfCompatibilityReport[],
  actionLabel: string,
) {
  const riskyReports = reports.filter((report) => report.issues.length > 0);
  if (!riskyReports.length) return null;

  const details = riskyReports.flatMap((report) =>
    report.issues.map((issue) => `• ${report.fileName}: ${issue.message}`),
  );

  return [
    `${actionLabel} rebuilds PDF pages and cannot safely preserve every interactive document feature.`,
    "",
    ...details,
    "",
    "Basic metadata, page sizes, page order, page rotation, and ordinary page content will be preserved.",
    "Continue only if you accept these changes.",
  ].join("\n");
}

export async function confirmPdfCompatibility(
  files: readonly File[],
  actionLabel: string,
) {
  const reports = await Promise.all(files.map((file) => inspectPdfCompatibility(file)));
  const warning = buildPdfCompatibilityWarning(reports, actionLabel);

  if (!warning) return { confirmed: true, reports };
  if (typeof window === "undefined") return { confirmed: false, reports };

  return {
    confirmed: window.confirm(warning),
    reports,
  };
}

function setIfPresent(value: string | undefined, setter: (next: string) => void) {
  if (value) setter(value);
}

export function copyPdfDocumentMetadata(
  source: PdfLibDocument,
  destination: PdfLibDocument,
) {
  setIfPresent(source.getTitle(), (value) => destination.setTitle(value));
  setIfPresent(source.getAuthor(), (value) => destination.setAuthor(value));
  setIfPresent(source.getSubject(), (value) => destination.setSubject(value));
  setIfPresent(source.getCreator(), (value) => destination.setCreator(value));
  setIfPresent(source.getProducer(), (value) => destination.setProducer(value));

  const keywords = source.getKeywords();
  if (keywords) {
    destination.setKeywords(
      keywords
        .split(/[,;]\s*/)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    );
  }

  const creationDate = source.getCreationDate();
  if (creationDate) destination.setCreationDate(creationDate);

  const modificationDate = source.getModificationDate();
  if (modificationDate) destination.setModificationDate(modificationDate);
}
