"use client";

import PdfToImagesPage from "../pdf-to-images/page";

export default function PdfToJpgPage() {
  return (
    <PdfToImagesPage
      variant={{
        title: "PDF to JPG",
        subtitle: "Export PDF pages as JPG images.",
        initialStatus: "Upload a PDF to export pages as JPG images.",
        defaultFormat: "jpeg",
      }}
    />
  );
}
