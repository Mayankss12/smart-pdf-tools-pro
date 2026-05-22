"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";

import { loginVerifyPasswordAction, type ActionResult } from "@/app/actions/auth";
import { AuthButton } from "./AuthButton";
import { AuthInput } from "./AuthInput";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountCreated = searchParams.get("message") === "account-created";
  const passwordReset = searchParams.get("message") === "password-reset";

  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    loginVerifyPasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.success && state.message) {
      router.push(`/login/verify-otp?email=${encodeURIComponent(state.message)}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      {accountCreated ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-800">
          Account created successfully. Sign in below.
        </div>
      ) : null}

      {passwordReset ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-800">
          Password updated successfully. Sign in with your new password.
        </div>
      ) : null}

      <AuthInput
        name="email"
        label="Email address"
        type="email"
        placeholder="jane@example.com"
        autoComplete="email"
        required
        error={state?.success === false && state.field === "email" ? state.error : undefined}
      />
      <AuthInput
        name="password"
        label="Password"
        type="password"
        placeholder="Your password"
        autoComplete="current-password"
        required
        error={state?.success === false && state.field === "password" ? state.error : undefined}
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-[var(--violet-600)] hover:underline">
          Forgot password?
        </Link>
      </div>

      {state?.success === false && !state.field ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
          <p>{state.error}</p>
          <p className="mt-1 text-xs text-red-600/80">
            Signed up previously?{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              Use Forgot Password to set your password.
            </Link>
          </p>
        </div>
      ) : null}

      <AuthButton isPending={isPending} label="Continue" pendingLabel="Verifying..." />
    </form>
  );
}
