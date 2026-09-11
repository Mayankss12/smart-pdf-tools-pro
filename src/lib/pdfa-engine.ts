import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

export type PdfaCheck = {
  readonly id: string;
  readonly label: string;
  readonly status: "pass" | "warning" | "fail";
  readonly message: string;
};

export type PdfaReport = {
  readonly pageCount: number;
  readonly declaredPart: string | null;
  readonly declaredConformance: string | null;
  readonly appearsPdfa: boolean;
  readonly certificationRequired: boolean;
  readonly checks: readonly PdfaCheck[];
};

export function serializePdfaReport(
  report: PdfaReport,
  fileName: string,
  inspectedAt = new Date(),
) {
  const summary = report.checks.reduce(
    (counts, check) => ({ ...counts, [check.status]: counts[check.status] + 1 }),
    { pass: 0, warning: 0, fail: 0 },
  );

  return JSON.stringify(
    {
      report: "PDFMantra PDF/A archival-readiness preflight",
      fileName,
      inspectedAt: inspectedAt.toISOString(),
      pageCount: report.pageCount,
      declaration:
        report.declaredPart && report.declaredConformance
          ? `PDF/A-${report.declaredPart}${report.declaredConformance.toLowerCase()}`
          : null,
      summary,
      appearsPdfa: report.appearsPdfa,
      certificationRequired: report.certificationRequired,
      checks: report.checks,
      notice:
        "This browser preflight is not an ISO 19005 certification. Validate regulated archival files with a dedicated conforming validator.",
    },
    null,
    2,
  );
}

function sourceText(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes);
}

function xmpValue(source: string, key: string) {
  const attribute = new RegExp(`${key}=["']([^"']+)["']`, "i").exec(source)?.[1];
  if (attribute) return attribute.trim();
  return new RegExp(`<${key}[^>]*>([^<]+)</${key}>`, "i").exec(source)?.[1]?.trim() ?? null;
}

function marker(source: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(source));
}

export async function inspectPdfaReadiness(bytes: Uint8Array): Promise<PdfaReport> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const source = sourceText(bytes);
  const declaredPart = xmpValue(source, "pdfaid:part");
  const declaredConformance = xmpValue(source, "pdfaid:conformance");
  const hasMetadata = Boolean(pdf.catalog.get(PDFName.of("Metadata"))) || /pdfaid:/i.test(source);
  const hasOutputIntent = Boolean(pdf.catalog.get(PDFName.of("OutputIntents"))) || /\/OutputIntent/i.test(source);
  const hasJavaScript = marker(source, [/\/JavaScript\b/, /\/S\s*\/JavaScript\b/, /\/JS\s*[<(]/]);
  const hasEmbeddedFiles = marker(source, [/\/EmbeddedFiles\b/, /\/Type\s*\/Filespec\b/]);
  const hasEncryption = marker(source, [/\/Encrypt\b/]);
  const hasMultimedia = marker(source, [/\/Subtype\s*\/(Movie|Sound|RichMedia|Screen)\b/]);
  const hasLaunchActions = marker(source, [/\/S\s*\/Launch\b/]);
  const fontObjects = (source.match(/\/Type\s*\/Font\b/g) ?? []).length;
  const embeddedFontStreams = (source.match(/\/(FontFile|FontFile2|FontFile3)\b/g) ?? []).length;
  const hasForms = Boolean(pdf.catalog.getAcroForm());
  const checks: PdfaCheck[] = [
    {
      id: "declaration",
      label: "PDF/A identification metadata",
      status: declaredPart && declaredConformance ? "pass" : "fail",
      message: declaredPart && declaredConformance
        ? `Declares PDF/A-${declaredPart}${declaredConformance.toLowerCase()}.`
        : "No complete PDF/A identification declaration was found.",
    },
    {
      id: "xmp",
      label: "XMP metadata",
      status: hasMetadata ? "pass" : "fail",
      message: hasMetadata ? "An XMP metadata packet is present." : "PDF/A requires an XMP metadata packet.",
    },
    {
      id: "output-intent",
      label: "Output color intent",
      status: hasOutputIntent ? "pass" : "fail",
      message: hasOutputIntent ? "An output intent is present." : "No embedded output color intent was detected.",
    },
    {
      id: "encryption",
      label: "Encryption",
      status: hasEncryption ? "fail" : "pass",
      message: hasEncryption ? "Encrypted PDFs cannot conform to PDF/A." : "No encryption dictionary was detected.",
    },
    {
      id: "active-content",
      label: "JavaScript and launch actions",
      status: hasJavaScript || hasLaunchActions ? "fail" : "pass",
      message: hasJavaScript || hasLaunchActions ? "Prohibited active content was detected." : "No JavaScript or launch action marker was detected.",
    },
    {
      id: "attachments",
      label: "Attachments",
      status: hasEmbeddedFiles ? "warning" : "pass",
      message: hasEmbeddedFiles ? "Embedded files require a PDF/A-3-specific review." : "No embedded file marker was detected.",
    },
    {
      id: "multimedia",
      label: "Multimedia",
      status: hasMultimedia ? "fail" : "pass",
      message: hasMultimedia ? "Prohibited multimedia content was detected." : "No multimedia annotation marker was detected.",
    },
    {
      id: "fonts",
      label: "Embedded fonts",
      status: fontObjects === 0 || embeddedFontStreams > 0 ? "warning" : "fail",
      message:
        fontObjects === 0
          ? "No font objects were detected in the raw preflight."
          : embeddedFontStreams > 0
            ? "Embedded font streams were detected, but every glyph still needs certified validation."
            : "Font objects were found without a detectable embedded font stream.",
    },
    {
      id: "forms",
      label: "Interactive forms",
      status: hasForms ? "warning" : "pass",
      message: hasForms ? "Interactive form behavior requires profile-specific validation or flattening." : "No AcroForm dictionary was detected.",
    },
  ];

  return {
    pageCount: pdf.getPageCount(),
    declaredPart,
    declaredConformance,
    appearsPdfa: checks.every((check) => check.status !== "fail"),
    certificationRequired: true,
    checks,
  };
}

export async function preparePdfForArchival(
  bytes: Uint8Array,
  options: { readonly title?: string; readonly author?: string; readonly language?: string } = {},
) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  names?.delete(PDFName.of("JavaScript"));
  names?.delete(PDFName.of("EmbeddedFiles"));
  pdf.catalog.delete(PDFName.of("OpenAction"));
  pdf.catalog.delete(PDFName.of("AA"));
  pdf.catalog.delete(PDFName.of("Collection"));
  pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of((options.language || "en-US").slice(0, 35)));
  pdf.setTitle((options.title || pdf.getTitle() || "Archived PDF").slice(0, 512));
  pdf.setAuthor((options.author || pdf.getAuthor() || "PDFMantra user").slice(0, 256));
  pdf.setCreator("PDFMantra archival preparation");
  pdf.setProducer("PDFMantra");
  pdf.setModificationDate(new Date());
  return pdf.save({ useObjectStreams: false, addDefaultPage: false });
}
