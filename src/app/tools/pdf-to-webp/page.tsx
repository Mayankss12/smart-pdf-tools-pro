"use client";

import PdfToImagesPage from "../pdf-to-images/page";

export default function PdfToWebpPage() {
  return (
    <PdfToImagesPage
      variant={{
        title: "PDF to WebP",
        subtitle: "Export PDF pages as modern WebP images.",
        initialStatus: "Upload a PDF to export pages as WebP images.",
        defaultFormat: "webp",
      }}
    />
  );
}
