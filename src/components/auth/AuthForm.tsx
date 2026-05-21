"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";
type LoginStep = "credentials" | "otp";

export interface AuthFormProps {
  readonly mode: AuthMode;
}

function normalizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");

  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const isSignup = mode === "signup";

  async function createSignupAccount() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName) {
      setError("Enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please agree to the Terms & Conditions before creating your account.");
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
      const { error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            phone_number: trimmedPhone || null,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (signupError) {
        throw signupError;
      }

      setMessage("Account created successfully. You can now login with email, password, and OTP.");
      setFullName("");
      setPhoneNumber("");
      setPassword("");
      setConfirmPassword("");
      setAcceptedTerms(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendLoginOtp(options?: { readonly resend?: boolean }) {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
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
      if (!options?.resend) {
        const { error: passwordError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (passwordError) {
          throw passwordError;
        }

        await supabase.auth.signOut();
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setEmail(trimmedEmail);
      setLoginStep("otp");
      setOtp("");
      setMessage(
        options?.resend
          ? "A fresh OTP has been sent to your email."
          : "Password verified. OTP has been sent to your email.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Login failed. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyLoginOtp() {
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedOtp = normalizeOtp(otp);

    if (normalizedOtp.length !== 6) {
      setError("Enter the 6-digit OTP from your email.");
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

    if (isSignup) {
      await createSignupAccount();
      return;
    }

    if (loginStep === "otp") {
      await verifyLoginOtp();
      return;
    }

    await sendLoginOtp();
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
            ? "Create your account with name, email, optional phone number, password, and terms acceptance."
            : "Login with your password first, then verify the OTP sent to your email every time."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-7">
        {isSignup ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Full name</span>
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Mayank Singh"
                className="input-premium pl-11"
                required
              />
            </div>
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
                if (!isSignup && loginStep === "otp") {
                  setLoginStep("credentials");
                  setOtp("");
                  setMessage(null);
                }
              }}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-premium pl-11"
              disabled={!isSignup && loginStep === "otp"}
            />
          </div>
        </label>

        {isSignup ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Phone number optional</span>
            <div className="relative mt-2">
              <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="Optional"
                className="input-premium pl-11"
              />
            </div>
          </label>
        ) : null}

        {loginStep === "credentials" || isSignup ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="Minimum 6 characters"
              className="input-premium mt-2"
            />
          </label>
        ) : null}

        {isSignup ? (
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Confirm password</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="input-premium mt-2"
            />
          </label>
        ) : null}

        {!isSignup && loginStep === "otp" ? (
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

        {isSignup ? (
          <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)] px-4 py-4 text-sm font-medium leading-6 text-[var(--text-secondary)]">
            <input
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[var(--border-light)] accent-[var(--violet-600)]"
              required
            />
            <span>
              I agree to PDFMantra&apos;s {" "}
              <Link href="/terms" className="font-bold text-[var(--violet-600)] hover:text-[var(--violet-500)]">
                Terms & Conditions
              </Link>{" "}
              and {" "}
              <Link href="/privacy" className="font-bold text-[var(--violet-600)] hover:text-[var(--violet-500)]">
                Privacy Policy
              </Link>
              .
            </span>
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
          <span>
            {isSignup
              ? "Create account"
              : loginStep === "otp"
                ? "Verify OTP"
                : "Verify password & send OTP"}
          </span>
          {!busy ? <ArrowRight size={16} /> : null}
        </button>

        {!isSignup && loginStep === "otp" ? (
          <button
            type="button"
            onClick={() => sendLoginOtp({ resend: true })}
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
                Log in
              </Link>
            </>
          ) : (
            <>
              New to PDFMantra?{" "}
              <Link href="/signup" className="font-bold text-[var(--violet-600)] hover:text-[var(--violet-500)]">
                Create account
              </Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
