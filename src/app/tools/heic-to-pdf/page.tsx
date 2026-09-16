"use client";

import ImagesToPdfPage, {
  type ImagesToPdfVariant,
} from "@/app/tools/images-to-pdf/page";

const HEIC_TO_PDF_VARIANT: ImagesToPdfVariant = {
  title: "HEIC to PDF",
  subtitle: "Convert HEIC and HEIF photos into an ordered PDF in your browser.",
  initialStatus: "Upload up to 20 HEIC or HEIF photos to convert into PDF.",
  accept: ".heic,.heif,image/heic,image/heif",
  outputSlug: "heic-to-pdf",
  source: "heic",
  maxFiles: 20,
};

export default function HeicToPdfPage() {
  return <ImagesToPdfPage variant={HEIC_TO_PDF_VARIANT} />;
}
