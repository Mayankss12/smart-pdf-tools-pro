import { ShieldOff } from "lucide-react";

import { BackendToolShell } from "@/components/BackendToolShell";

export default function UnlockPdfPage() {
  return (
    <BackendToolShell
      icon={ShieldOff}
      eyebrow="Authorized access workflow"
      title="Unlock PDFs you own or are allowed to access."
      description="Unlocking must be handled carefully with user-supplied passwords, authorization checks, and secure backend processing."
      steps={[
        "User confirms they own or are authorized to unlock the PDF.",
        "User uploads the protected PDF and enters the known password.",
        "Backend validates the password and creates an unlocked copy.",
        "Unlocked output is delivered privately with safe retention rules.",
      ]}
      capabilityNote="This workflow is for authorized documents only. It is not intended to bypass unknown passwords or access restrictions."
    />
  );
}
