"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

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
        <div
          role="status"
          className="flex items-start gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-left"
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-emerald-700"
            size={18}
          />
          <p className="text-sm font-medium leading-6 text-emerald-800">
            {state.message}
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-bold text-violet-700 outline-none hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
        >
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
        <div
          role="alert"
          className="rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {state.error}
        </div>
      ) : null}
      <AuthButton
        isPending={isPending}
        label="Send reset link"
        pendingLabel="Sending link"
      />
    </form>
  );
}
