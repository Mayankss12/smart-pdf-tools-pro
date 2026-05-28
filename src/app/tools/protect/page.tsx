import { ShieldCheck } from "lucide-react";

import { BackendToolShell } from "@/components/BackendToolShell";

export default function ProtectPdfPage() {
  return (
    <BackendToolShell
      icon={ShieldCheck}
      eyebrow="Security workflow"
      title="Protect PDF with password security."
      description="Password protection needs backend-grade encryption, account gating, and secure delivery before it becomes a production tool."
      steps={[
        "User uploads a PDF through authenticated secure storage.",
        "User sets password and permission preferences.",
        "Backend applies proper PDF encryption and validates output.",
        "Protected PDF is delivered privately with controlled retention.",
      ]}
      capabilityNote="This page now exists as the product workflow shell. The encryption backend should be connected before marking it as a live browser tool."
    />
  );
}
