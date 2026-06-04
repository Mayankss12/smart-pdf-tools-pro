"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { resendOtpAction, type ActionResult } from "@/app/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const OTP_LENGTH = 6;

interface OtpVerifyFormProps {
  readonly email: string;
  readonly redirectTo?: string;
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

function getSafeRedirectPath(value: string | undefined): string {
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

function getOtpErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("expired") || lowerMessage.includes("invalid")) {
    return "Code is incorrect or has expired. Request a new code and try again.";
  }

  return "Verification failed. Please try again.";
}

export function OtpVerifyForm({ email, redirectTo }: OtpVerifyFormProps) {
  const router = useRouter();
  const safeRedirectTo = getSafeRedirectPath(redirectTo);

  const [otp, setOtp] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendState, resendAction, isResending] = useActionState<
    ActionResult | null,
    FormData
  >(resendOtpAction, null);

  function focusDigit(index: number) {
    const safeIndex = Math.max(0, Math.min(index, OTP_LENGTH - 1));
    inputRefs.current[safeIndex]?.focus();
    inputRefs.current[safeIndex]?.select();
  }

  function handleDigitChange(index: number, value: string) {
    const cleanValue = normalizeOtp(value);

    if (cleanValue.length > 1) {
      setOtp(cleanValue);
      setVerifyError(null);
      focusDigit(cleanValue.length >= OTP_LENGTH ? OTP_LENGTH - 1 : cleanValue.length);
      return;
    }

    const digits = Array.from(
      { length: OTP_LENGTH },
      (_, digitIndex) => otp[digitIndex] || "",
    );

    digits[index] = cleanValue;

    const nextOtp = digits.join("").slice(0, OTP_LENGTH);

    setOtp(nextOtp);
    setVerifyError(null);

    if (cleanValue && index < OTP_LENGTH - 1) {
      focusDigit(index + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedOtp = normalizeOtp(event.clipboardData.getData("text"));

    if (!pastedOtp) return;

    setOtp(pastedOtp);
    setVerifyError(null);
    focusDigit(pastedOtp.length >= OTP_LENGTH ? OTP_LENGTH - 1 : pastedOtp.length);
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      focusDigit(index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusDigit(index + 1);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (otp.length !== OTP_LENGTH || isVerifying) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setVerifyError("Authentication service is not configured yet.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setVerifyError(getOtpErrorMessage(error.message));
        return;
      }

      await supabase.auth.getUser();

      await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      router.refresh();
      router.replace(safeRedirectTo);
    } catch {
      setVerifyError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  const isComplete = otp.length === OTP_LENGTH;

  return (
    <div className="space-y-5">
      <div className="rounded-[1.35rem] border border-violet-100 bg-violet-50/70 p-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
            <MailCheck size={22} />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-950">
              Verification code sent
            </div>
            <p className="mt-1 break-words text-sm leading-6 text-slate-600">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-slate-950">{email}</span>.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleVerifySubmit} className="space-y-5">
        <div>
          <label className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text-primary)]">
            <span>6-digit code</span>
            <span className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {otp.length}/{OTP_LENGTH}
            </span>
          </label>

          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={OTP_LENGTH}
                value={otp[index] || ""}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                disabled={isVerifying}
                className="h-13 min-h-13 w-full rounded-2xl border border-[var(--border-light)] bg-white text-center text-2xl font-black tracking-[-0.04em] text-[var(--text-primary)] outline-none transition focus:border-[var(--violet-600)] focus:ring-4 focus:ring-[rgba(101,80,232,0.16)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:h-14 sm:min-h-14"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            You can paste the full code from your email. Only numbers are accepted.
          </p>
        </div>

        {verifyError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {verifyError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isComplete || isVerifying}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--violet-600)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-500)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Verifying secure login
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Verify & Sign In
            </>
          )}
        </button>
      </form>

      <div className="rounded-[1.35rem] border border-[var(--border-light)] bg-slate-50 p-4">
        {resendState?.success ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
            <span>{resendState.message}</span>
          </div>
        ) : null}

        {resendState?.success === false ? (
          <p className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            {resendState.error}
          </p>
        ) : null}

        <form
          action={resendAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <input type="hidden" name="email" value={email} />
          <p className="text-sm text-[var(--text-muted)]">
            Didn&apos;t receive the code?
          </p>
          <button
            type="submit"
            disabled={isResending || isVerifying}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-semibold text-[var(--violet-600)] transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={isResending ? "animate-spin" : ""} size={15} />
            {isResending ? "Sending" : "Resend code"}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Wrong email?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--violet-600)] hover:underline"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
