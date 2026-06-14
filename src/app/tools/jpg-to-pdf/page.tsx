"use client";

import ImagesToPdfPage from "../images-to-pdf/page";

export default function JpgToPdfPage() {
  return (
    <ImagesToPdfPage
      variant={{
        title: "JPG to PDF",
        subtitle: "Convert JPG photos, scans, or screenshots into a clean PDF.",
        initialStatus: "Upload JPG or JPEG images to convert into PDF.",
        accept: "image/jpeg,image/jpg",
        outputSlug: "jpg-to-pdf",
      }}
    />
  );
}
