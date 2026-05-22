"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { resetPasswordAction, type ActionResult } from "@/app/actions/auth";
import { AuthButton } from "./AuthButton";
import { AuthInput } from "./AuthInput";

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      const timeout = window.setTimeout(() => {
        router.push("/login?message=password-reset");
      }, 1600);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [state, router]);

  if (state?.success) {
    return (
      <div className="space-y-3 text-center">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-800">
          {state.message}
        </div>
        <p className="text-xs text-[var(--text-muted)]">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        name="password"
        label="New password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        error={state?.success === false && state.field === "password" ? state.error : undefined}
      />
      <AuthInput
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        placeholder="Re-enter your new password"
        autoComplete="new-password"
        required
        error={state?.success === false && state.field === "confirmPassword" ? state.error : undefined}
      />
      {state?.success === false && !state.field ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
          {state.error}
        </div>
      ) : null}
      <AuthButton isPending={isPending} label="Set new password" pendingLabel="Updating..." />
    </form>
  );
}
