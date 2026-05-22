"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { resendOtpAction, verifyOtpAction, type ActionResult } from "@/app/actions/auth";

interface OtpVerifyFormProps {
  readonly email: string;
}

export function OtpVerifyForm({ email }: OtpVerifyFormProps) {
  const [otp, setOtp] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verifyState, verifyAction, isVerifying] = useActionState<ActionResult | null, FormData>(
    verifyOtpAction,
    null,
  );
  const [resendState, resendAction, isResending] = useActionState<ActionResult | null, FormData>(
    resendOtpAction,
    null,
  );

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const digits = otp.padEnd(6, " ").split("");
    digits[index] = value.slice(-1) || " ";
    const nextOtp = digits.join("").replace(/\s/g, "").slice(0, 6);

    setOtp(nextOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-3 block text-sm font-semibold text-[var(--text-primary)]">
          Verification code
        </label>
        <div className="flex justify-between gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[index] || ""}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="h-12 w-11 rounded-xl border border-[var(--border-light)] bg-white text-center text-xl font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--violet-600)] focus:ring-2 focus:ring-[rgba(101,80,232,0.16)] sm:w-12"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <form action={verifyAction} id="verify-otp-form">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={otp} />
      </form>

      {verifyState?.success === false ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
          {verifyState.error}
        </div>
      ) : null}

      <button
        type="submit"
        form="verify-otp-form"
        disabled={otp.length !== 6 || isVerifying}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--violet-600)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-500)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerifying ? "Verifying..." : "Verify & Sign In"}
      </button>

      <div className="border-t border-[var(--border-light)] pt-4">
        {resendState?.success ? (
          <p className="mb-2 text-sm font-medium text-emerald-700">{resendState.message}</p>
        ) : null}
        {resendState?.success === false ? (
          <p className="mb-2 text-sm font-medium text-red-700">{resendState.error}</p>
        ) : null}
        <form action={resendAction} className="flex items-center justify-between gap-3">
          <input type="hidden" name="email" value={email} />
          <p className="text-sm text-[var(--text-muted)]">Didn&apos;t receive a code?</p>
          <button
            type="submit"
            disabled={isResending}
            className="text-sm font-semibold text-[var(--violet-600)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend code"}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Wrong email?{" "}
        <Link href="/login" className="font-semibold text-[var(--violet-600)] hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
