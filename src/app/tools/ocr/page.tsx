import { Brain } from "lucide-react";

import { BackendToolShell } from "@/components/BackendToolShell";

export default function OcrPdfPage() {
  return (
    <BackendToolShell
      icon={Brain}
      eyebrow="OCR workflow"
      title="Make scanned PDFs searchable."
      description="OCR requires heavier processing to recognize text, rebuild searchable layers, and preserve document quality."
      steps={[
        "User uploads a scanned or image-based PDF.",
        "Backend renders pages and runs OCR text recognition.",
        "Recognized text is embedded as a searchable layer.",
        "Searchable PDF is validated and delivered privately.",
      ]}
      capabilityNote="OCR should run on the backend for accuracy, performance, language support, and stable handling of large scanned documents."
    />
  );
}
