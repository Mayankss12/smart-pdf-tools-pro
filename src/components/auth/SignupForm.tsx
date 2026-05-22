"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { signupAction, type ActionResult } from "@/app/actions/auth";
import { AuthButton } from "./AuthButton";
import { AuthInput } from "./AuthInput";

export function SignupForm() {
  const router = useRouter();
  const [state, action, isPending] = useActionState<ActionResult | null, FormData>(
    signupAction,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/login?message=account-created");
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        name="fullName"
        label="Full name"
        type="text"
        placeholder="Jane Smith"
        autoComplete="name"
        required
        error={state?.success === false && state.field === "fullName" ? state.error : undefined}
      />
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
        name="phone"
        label="Phone number"
        type="tel"
        placeholder="+91 98765 43210"
        autoComplete="tel"
        optional
      />
      <AuthInput
        name="password"
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        error={state?.success === false && state.field === "password" ? state.error : undefined}
      />
      <AuthInput
        name="confirmPassword"
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
        error={state?.success === false && state.field === "confirmPassword" ? state.error : undefined}
      />

      <div className="flex items-start gap-3 pt-1">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--border-light)] accent-[var(--violet-600)]"
        />
        <label htmlFor="acceptTerms" className="text-sm leading-6 text-[var(--text-secondary)]">
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-[var(--violet-600)] hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-[var(--violet-600)] hover:underline">
            Privacy Policy
          </Link>
          .
        </label>
      </div>

      {state?.success === false && !state.field ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
          {state.error}
        </div>
      ) : null}

      <AuthButton isPending={isPending} label="Create account" pendingLabel="Creating account..." />
    </form>
  );
}
