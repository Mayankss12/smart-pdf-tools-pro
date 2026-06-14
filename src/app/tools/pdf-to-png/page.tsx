"use client";

import PdfToImagesPage from "../pdf-to-images/page";

export default function PdfToPngPage() {
  return (
    <PdfToImagesPage
      variant={{
        title: "PDF to PNG",
        subtitle: "Export PDF pages as PNG images.",
        initialStatus: "Upload a PDF to export pages as PNG images.",
        defaultFormat: "png",
      }}
    />
  );
}
