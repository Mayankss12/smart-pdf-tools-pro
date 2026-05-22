"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction, type ActionResult } from "@/app/actions/auth";
import { AuthButton } from "./AuthButton";
import { AuthInput } from "./AuthInput";

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{state.message}</p>
        <Link href="/login" className="block text-sm font-semibold text-[var(--violet-600)] hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        name="email"
        label="Email address"
        type="email"
        placeholder="jane@example.com"
        autoComplete="email"
        required
        error={state?.success === false && state.field === "email" ? state.error : undefined}
      />
      {state?.success === false && !state.field ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
          {state.error}
        </div>
      ) : null}
      <AuthButton isPending={isPending} label="Send reset link" pendingLabel="Sending..." />
    </form>
  );
}
