"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

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
      return;
    }

    if (state?.success === false) {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")
          ?.focus();
      });
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3.5">
      <AuthInput
        name="fullName"
        label="Full name"
        type="text"
        placeholder="Your full name"
        autoComplete="name"
        required
        error={state?.success === false && state.field === "fullName" ? state.error : undefined}
      />

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
        error={
          state?.success === false && state.field === "confirmPassword"
            ? state.error
            : undefined
        }
      />

      <div className="pt-0.5">
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-slate-300 accent-[var(--violet-600)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          />

          <label
            htmlFor="acceptTerms"
            className="text-xs leading-5 text-slate-600"
          >
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-semibold text-[var(--violet-600)] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-[var(--violet-600)] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </label>
        </div>
      </div>

      {state?.success === false && !state.field ? (
        <div
          role="alert"
          tabIndex={-1}
          className="flex gap-3 rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium leading-6 text-red-700 outline-none focus:ring-4 focus:ring-red-100"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <span>{state.error}</span>
        </div>
      ) : null}

      <AuthButton
        isPending={isPending}
        label="Create account"
        pendingLabel="Creating account"
      />
    </form>
  );
}
