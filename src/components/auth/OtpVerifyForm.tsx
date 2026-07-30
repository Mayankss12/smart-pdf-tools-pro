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
  Mail,
  RefreshCw,
} from "lucide-react";

import { resendOtpAction, type ActionResult } from "@/app/actions/auth";

const OTP_LENGTH = 6;

interface OtpVerifyFormProps {
  readonly email: string;
  readonly redirectTo?: string;
}

type VerifyOtpApiResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");

  if (!domain) return email;

  const visibleCharacters = Math.min(2, localPart.length);
  const maskedCharacters = Math.max(3, localPart.length - visibleCharacters);

  return `${localPart.slice(0, visibleCharacters)}${"•".repeat(
    maskedCharacters,
  )}@${domain}`;
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

async function parseVerifyOtpResponse(response: Response) {
  try {
    return (await response.json()) as VerifyOtpApiResponse;
  } catch {
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
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
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({
          email,
          token: otp,
          redirectTo: safeRedirectTo,
        }),
      });

      const payload = await parseVerifyOtpResponse(response);

      if (!response.ok || !payload.success) {
        setVerifyError(payload.error || "Verification failed. Please try again.");
        return;
      }

      router.refresh();
      router.replace(payload.redirectTo || safeRedirectTo);
    } catch {
      setVerifyError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  const isComplete = otp.length === OTP_LENGTH;
  const maskedEmail = maskEmail(email);

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="flex items-start gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3.5 py-3"
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Mail aria-hidden="true" size={15} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900">
            Verification code sent to your email
          </p>
          <p className="mt-0.5 break-words text-xs leading-5 text-emerald-800">
            {maskedEmail}
          </p>
        </div>
      </div>

      <form onSubmit={handleVerifySubmit} className="space-y-4">
        <div>
          <label
            id="otp-label"
            className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.08em] text-slate-700"
          >
            6-digit verification code
          </label>

          <div
            role="group"
            aria-labelledby="otp-label"
            aria-describedby="otp-helper"
            className="grid grid-cols-6 gap-1.5 sm:gap-2"
          >
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
                aria-invalid={verifyError ? "true" : undefined}
                aria-label={`Verification code digit ${index + 1}`}
                className={`h-[50px] min-w-0 w-full rounded-[13px] border bg-white text-center text-xl font-bold tracking-[-0.04em] text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-200/60 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 motion-reduce:transition-none ${
                  verifyError ? "border-red-400" : "border-slate-200"
                }`}
              />
            ))}
          </div>

          <p id="otp-helper" className="mt-2 text-xs leading-5 text-slate-500">
            You can paste the full code from your email. Only numbers are accepted.
          </p>
        </div>

        {verifyError ? (
          <div
            role="alert"
            className="rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium leading-6 text-red-700"
          >
            {verifyError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isComplete || isVerifying}
          aria-busy={isVerifying}
          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#5f4bc6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(74,55,168,0.2)] outline-none transition hover:-translate-y-0.5 hover:bg-[#503db5] focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
        >
          {isVerifying ? (
            <>
              <Loader2
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={18}
              />
              Verifying code
            </>
          ) : (
            "Verify & sign in"
          )}
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4">
        {resendState?.success ? (
          <div
            role="status"
            className="mb-3 flex items-start gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
            <span>{resendState.message}</span>
          </div>
        ) : null}

        {resendState?.success === false ? (
          <p
            role="alert"
            className="mb-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
          >
            {resendState.error}
          </p>
        ) : null}

        <form
          action={resendAction}
          className="flex items-center justify-center gap-2 text-sm"
        >
          <input type="hidden" name="email" value={email} />
          <span className="text-slate-500">Didn&apos;t receive it?</span>
          <button
            type="submit"
            disabled={isResending || isVerifying}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 font-bold text-violet-700 outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            <RefreshCw
              aria-hidden="true"
              className={
                isResending
                  ? "animate-spin motion-reduce:animate-none"
                  : undefined
              }
              size={14}
            />
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
