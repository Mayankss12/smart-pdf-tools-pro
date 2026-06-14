"use client";

import ImagesToPdfPage from "../images-to-pdf/page";

export default function PngToPdfPage() {
  return (
    <ImagesToPdfPage
      variant={{
        title: "PNG to PDF",
        subtitle: "Convert PNG images or screenshots into a clean PDF.",
        initialStatus: "Upload PNG images to convert into PDF.",
        accept: "image/png",
        outputSlug: "png-to-pdf",
      }}
    />
  );
}
