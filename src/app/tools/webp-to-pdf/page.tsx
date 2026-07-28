"use client";

import ImagesToPdfPage from "../images-to-pdf/page";

export default function WebpToPdfPage() {
  return (
    <ImagesToPdfPage
      variant={{
        title: "WebP to PDF",
        subtitle: "Convert WebP images into a clean PDF.",
        initialStatus: "Upload WebP images to convert into PDF.",
        accept: "image/webp",
        outputSlug: "webp-to-pdf",
      }}
    />
  );
}
