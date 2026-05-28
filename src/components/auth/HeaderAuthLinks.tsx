"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type HeaderAuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
};

type SessionResponse = {
  isSignedIn?: boolean;
};

function useHeaderAuthState(): HeaderAuthState {
  const [authState, setAuthState] = useState<HeaderAuthState>({
    isLoaded: false,
    isSignedIn: false,
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to read session");
        }

        const data = (await response.json()) as SessionResponse;

        if (isMounted) {
          setAuthState({ isLoaded: true, isSignedIn: Boolean(data.isSignedIn) });
        }
      } catch {
        if (isMounted) {
          setAuthState({ isLoaded: true, isSignedIn: false });
        }
      }
    }

    loadSession();

    function handleFocus() {
      loadSession();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      controller.abort();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return authState;
}

export function HeaderAuthLinks() {
  const { isLoaded, isSignedIn } = useHeaderAuthState();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3" aria-label="Loading account status">
        <span className="h-4 w-20 animate-pulse rounded-full bg-violet-100" />
        <span className="h-10 w-24 animate-pulse rounded-full bg-violet-100" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-[13px] font-bold text-slate-800 transition hover:text-violet-700">
          My Account
        </Link>
        <Link href="/logout" className="header-cta min-h-10 px-4 text-[13px]">
          <span>Logout</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-[13px] font-bold text-slate-800 transition hover:text-violet-700">
        Login
      </Link>
      <Link href="/signup" className="header-cta min-h-10 px-4 text-[13px]">
        <span>Sign up</span>
      </Link>
    </div>
  );
}

export function MobileHeaderAuthLink() {
  const { isLoaded, isSignedIn } = useHeaderAuthState();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-500">
        Checking account...
      </div>
    );
  }

  return (
    <Link
      href={isSignedIn ? "/dashboard" : "/login"}
      className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
    >
      {isSignedIn ? "My Account" : "Login / Sign up"}
      <ArrowRight size={15} />
    </Link>
  );
}
