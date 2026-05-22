import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password — PDFMantra",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="Set your new password"
      subtitle="Choose a strong password with at least 8 characters."
    >
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
