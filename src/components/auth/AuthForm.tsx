"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";
type OtpStep = "email" | "verify";

export interface AuthFormProps {
  readonly mode: AuthMode;
}

function getOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function getEmailRedirectUrl(redirectTo: string): string {
  return `${getOrigin()}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
}

function normalizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<OtpStep>("email");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const isSignup = mode === "signup";

  async function sendOtpEmail(options?: { readonly resend?: boolean }) {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter your email address first.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase is not configured yet. Please check the project environment variables.");
      return;
    }

    const setLoading = options?.resend ? setResendBusy : setBusy;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: isSignup,
          emailRedirectTo: getEmailRedirectUrl(redirectTo),
          data: isSignup
            ? {
                full_name: fullName.trim() || null,
              }
            : undefined,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setEmail(trimmedEmail);
      setStep("verify");
      setOtp("");
      setMessage(
        options?.resend
          ? "A fresh OTP code has been sent to your email."
          : "OTP code sent. Check your email and enter the 6-digit code here.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send OTP code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpCode() {
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedOtp = normalizeOtp(otp);

    if (!trimmedEmail) {
      setError("Enter your email address first.");
      setStep("email");
      return;
    }

    if (normalizedOtp.length !== 6) {
      setError("Enter the 6-digit OTP code from your email.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase is not configured yet. Please check the project environment variables.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: normalizedOtp,
        type: "email",
      });

      if (verifyError) {
        throw verifyError;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "OTP verification failed. Please request a new OTP and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === "verify") {
      await verifyOtpCode();
      return;
    }

    await sendOtpEmail();
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-light)] bg-[var(--violet-50)] px-6 py-6 sm:px-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
          {isSignup ? <UserPlus size={22} /> : <LockKeyhole size={22} />}
        </div>
        <h1 className="display-font text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
          {isSignup ? "Create your PDFMantra account" : "Log in to PDFMantra"}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">
          {isSignup
            ? "Use email OTP to create your account. No password or confirmation-link redirect needed."
            : "Use email OTP to access your dashboard securely without a password."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-7">
        {isSignup && step === "email" ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              type="text"
              autoComplete="name"
              placeholder="Mayank Singh"
              className="input-premium mt-2"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Email address</span>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (step === "verify") {
                  setStep("email");
                  setOtp("");
                  setMessage(null);
                }
              }}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-premium pl-11"
            />
          </div>
        </label>

        {step === "verify" ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Email OTP code</span>
            <div className="relative mt-2">
              <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
              <input
                value={otp}
                onChange={(event) => setOtp(normalizeOtp(event.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                className="input-premium pl-11 tracking-[0.3em]"
                maxLength={6}
                required
              />
            </div>
          </label>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={busy || resendBusy} className="btn-primary w-full">
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          <span>{step === "verify" ? "Verify OTP" : isSignup ? "Send signup OTP" : "Send login OTP"}</span>
          {!busy ? <ArrowRight size={16} /> : null}
        </button>

        {step === "verify" ? (
          <button
            type="button"
            onClick={() => sendOtpEmail({ resend: true })}
            disabled={busy || resendBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-3 text-sm font-bold text-[var(--violet-600)] transition hover:border-[var(--border-focus)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendBusy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
            Resend OTP
          </button>
        ) : null}

        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)] px-4 py-4 text-center text-sm font-medium text-[var(--text-secondary)]">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[var(--violet-600)] hover:text-[var(--violet-500)]">
                Log in with OTP
              </Link>
            </>
          ) : (
            <>
              New to PDFMantra?{" "}
              <Link href="/signup" className="font-bold text-[var(--violet-600)] hover:text-[var(--violet-500)]">
                Create account with OTP
              </Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
