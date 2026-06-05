"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";

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
      <div className="rounded-[1.35rem] border border-violet-100 bg-violet-50/70 p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
            <ShieldCheck size={20} />
          </div>

          <div>
            <div className="text-sm font-bold text-slate-950">
              Create your PDFMantra account
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Enter your details to continue.
            </p>
          </div>
        </div>
      </div>

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

      <div className="rounded-2xl border border-[var(--border-light)] bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--border-light)] accent-[var(--violet-600)]"
          />

          <label
            htmlFor="acceptTerms"
            className="text-sm leading-6 text-[var(--text-secondary)]"
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
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
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
