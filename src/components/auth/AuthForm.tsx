"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";

export interface AuthFormProps {
  readonly mode: AuthMode;
}

function getOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setBusy(false);
      setError("Supabase is not configured yet. Please check the project environment variables.");
      return;
    }

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getOrigin()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            data: {
              full_name: fullName.trim() || null,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          router.replace(redirectTo);
          router.refresh();
          return;
        }

        setMessage("Account created. Please check your email to confirm your account, then log in.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
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
            ? "Create an account so PDFMantra can later save projects, signatures, documents, and usage history."
            : "Access your dashboard and prepare for saved PDF projects, signatures, and document history."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-7">
        {isSignup ? (
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
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-premium pl-11"
            />
          </div>
        </label>

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

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          <span>{isSignup ? "Create account" : "Log in"}</span>
          {!busy ? <ArrowRight size={16} /> : null}
        </button>

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
