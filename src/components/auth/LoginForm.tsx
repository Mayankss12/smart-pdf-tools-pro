"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { loginVerifyPasswordAction, type ActionResult } from "@/app/actions/auth";
import { AuthButton } from "./AuthButton";
import { AuthInput } from "./AuthInput";

function getSafeRedirectPath(value: string | null): string {
  const rawValue = value?.trim() ?? "";

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/dashboard";
  }

  const blockedPrefixes = ["/login", "/signup", "/logout", "/auth"];

  if (
    blockedPrefixes.some(
      (prefix) => rawValue === prefix || rawValue.startsWith(`${prefix}/`),
    )
  ) {
    return "/dashboard";
  }

  return rawValue;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountCreated = searchParams.get("message") === "account-created";
  const passwordReset = searchParams.get("message") === "password-reset";
  const redirectTo = getSafeRedirectPath(
    searchParams.get("redirectTo") ?? searchParams.get("next"),
  );

  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    loginVerifyPasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.success && state.message) {
      const params = new URLSearchParams({
        email: state.message,
        redirectTo,
      });

      router.push(`/login/verify-otp?${params.toString()}`);
    }
  }, [state, router, redirectTo]);

  return (
    <form action={action} className="space-y-4">
      {accountCreated ? (
        <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
          <span>Account created successfully. Sign in below to continue.</span>
        </div>
      ) : null}

      {passwordReset ? (
        <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
          <span>Password updated successfully. Sign in with your new password.</span>
        </div>
      ) : null}

      <AuthInput
        name="email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={state?.success === false && state.field === "email" ? state.error : undefined}
      />

      <AuthInput
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        error={state?.success === false && state.field === "password" ? state.error : undefined}
      />

      <div className="flex items-center justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-[var(--violet-600)] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {state?.success === false && !state.field ? (
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <div>
            <p>{state.error}</p>
            <p className="mt-1 text-xs text-red-600/80">
              Signed up previously?{" "}
              <Link href="/forgot-password" className="font-semibold underline">
                Use Forgot Password to set your password.
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <AuthButton
        isPending={isPending}
        label="Continue"
        pendingLabel="Checking password"
      />
    </form>
  );
}
