import { Wand2 } from "lucide-react";

import { BackendToolShell } from "@/components/BackendToolShell";

export default function PdfToWordPage() {
  return (
    <BackendToolShell
      icon={Wand2}
      eyebrow="Document workflow"
      title="PDF to Word workflow."
      description="This workflow is prepared for backend document processing with secure upload, account checks, and private output delivery."
      steps={[
        "User uploads a PDF through secure storage.",
        "Backend prepares the document structure.",
        "Editable output is generated and validated.",
        "The processed file is delivered privately.",
      ]}
      capabilityNote="The route now exists as a backend workflow shell and should be connected to a production document processing service before being marked live."
    />
  );
}
