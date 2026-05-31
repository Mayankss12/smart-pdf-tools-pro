"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

type HeaderAuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  email: string | null;
  displayName: string | null;
};

type SessionResponse = {
  isSignedIn?: boolean;
  email?: string | null;
  displayName?: string | null;
};

const ACCOUNT_MENU_ITEMS = [
  {
    label: "My Account",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Subscription details",
    href: "/pricing",
    icon: CreditCard,
  },
  {
    label: "About us",
    href: "/about",
    icon: Info,
  },
  {
    label: "Support",
    href: "/support",
    icon: HelpCircle,
  },
] as const;

function getInitial(displayName: string | null, email: string | null) {
  const source = displayName?.trim() || email?.trim() || "P";
  return source.charAt(0).toUpperCase();
}

function getAccountLabel(displayName: string | null, email: string | null) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (email?.trim()) {
    return email.trim();
  }

  return "PDFMantra User";
}

function useHeaderAuthState(): HeaderAuthState {
  const [authState, setAuthState] = useState<HeaderAuthState>({
    isLoaded: false,
    isSignedIn: false,
    email: null,
    displayName: null,
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
          setAuthState({
            isLoaded: true,
            isSignedIn: Boolean(data.isSignedIn),
            email: data.email ?? null,
            displayName: data.displayName ?? null,
          });
        }
      } catch {
        if (isMounted) {
          setAuthState({
            isLoaded: true,
            isSignedIn: false,
            email: null,
            displayName: null,
          });
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

function AccountAvatarMenu({
  email,
  displayName,
}: {
  readonly email: string | null;
  readonly displayName: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initial = getInitial(displayName, email);
  const accountLabel = getAccountLabel(displayName, email);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-100 bg-white px-2 py-1.5 text-slate-900 shadow-[0_12px_28px_rgba(76,47,209,0.08)] transition hover:border-violet-200 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-sm font-black text-white shadow-[0_12px_26px_rgba(101,80,232,0.25)]">
          {initial}
        </span>
        <ChevronDown
          size={15}
          className={`hidden text-slate-500 transition sm:block ${menuOpen ? "rotate-180 text-violet-700" : ""}`}
        />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-[290px] overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white shadow-[0_24px_70px_rgba(44,31,95,0.16)]"
        >
          <div className="border-b border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-base font-black text-white shadow-[0_12px_28px_rgba(101,80,232,0.24)]">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{accountLabel}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                  PDFMantra account
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            {ACCOUNT_MENU_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 bg-white text-violet-700">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <ArrowRight size={14} className="text-slate-300" />
                </Link>
              );
            })}
          </div>

          <div className="border-t border-violet-100 p-2">
            <Link
              href="/logout"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={17} />
              Logout
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderAuthLinks() {
  const { isLoaded, isSignedIn, email, displayName } = useHeaderAuthState();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3" aria-label="Loading account status">
        <span className="h-10 w-10 animate-pulse rounded-full bg-violet-100" />
      </div>
    );
  }

  if (isSignedIn) {
    return <AccountAvatarMenu email={email} displayName={displayName} />;
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

  if (isSignedIn) {
    return (
      <div>
        <Link
          href="/dashboard"
          className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
        >
          My Account
          <ArrowRight size={15} />
        </Link>
        <Link
          href="/pricing"
          className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
        >
          Subscription details
          <ArrowRight size={15} />
        </Link>
        <Link
          href="/logout"
          className="flex items-center justify-between px-4 py-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          Logout
          <LogOut size={15} />
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
    >
      Login / Sign up
      <ArrowRight size={15} />
    </Link>
  );
}