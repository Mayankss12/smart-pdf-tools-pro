import { Eye } from "lucide-react";

import { BackendToolShell } from "@/components/BackendToolShell";

export default function RedactPdfPage() {
  return (
    <BackendToolShell
      icon={Eye}
      eyebrow="Privacy workflow"
      title="Redact sensitive PDF content safely."
      description="Real redaction needs permanent content removal, not visual hiding. This workflow is prepared for backend-safe redaction processing."
      steps={[
        "User uploads a PDF through secure authenticated storage.",
        "User marks text or areas that need permanent removal.",
        "Backend applies true redaction and validates that content is removed.",
        "Redacted PDF is delivered privately with controlled retention.",
      ]}
      capabilityNote="This route is a backend workflow shell. Final implementation should remove content permanently instead of placing black boxes over it."
    />
  );
}
