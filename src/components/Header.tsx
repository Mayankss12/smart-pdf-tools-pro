"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useEffect, useMemo, useState } from "react";

interface HeaderNavItem {
  readonly label: string;
  readonly href: string;
  readonly status?: "live" | "beta" | "soon";
}

interface HeaderNavGroup {
  readonly label: string;
  readonly href: string;
  readonly items: readonly HeaderNavItem[];
}

const CATEGORY_NAV: readonly HeaderNavGroup[] = [
  {
    label: "Edit",
    href: "/editor",
    items: [
      { label: "PDF Editor", href: "/editor", status: "beta" },
      { label: "Add Text", href: "/editor", status: "beta" },
      { label: "Add Images", href: "/editor", status: "beta" },
      { label: "Sign PDF", href: "/editor", status: "beta" },
      { label: "Whiteout", href: "/editor", status: "soon" },
    ],
  },
  {
    label: "Merge",
    href: "/tools/merge",
    items: [
      { label: "Merge PDF", href: "/tools/merge", status: "soon" },
      { label: "Combine Files", href: "/tools/merge", status: "soon" },
      { label: "Organize PDF", href: "/tools/organize", status: "soon" },
      { label: "Images to PDF", href: "/tools/images-to-pdf", status: "soon" },
    ],
  },
  {
    label: "Split",
    href: "/tools/split",
    items: [
      { label: "Split PDF", href: "/tools/split", status: "soon" },
      { label: "Extract Pages", href: "/tools/extract", status: "soon" },
      { label: "Delete Pages", href: "/tools/delete-pages", status: "soon" },
      { label: "Reorder Pages", href: "/tools/reorder", status: "soon" },
      { label: "Rotate Pages", href: "/tools/rotate", status: "soon" },
    ],
  },
  {
    label: "Compress",
    href: "/tools/compress",
    items: [
      { label: "Compress PDF", href: "/tools/compress", status: "soon" },
      { label: "OCR PDF", href: "/tools/ocr", status: "soon" },
      { label: "Repair PDF", href: "/tools", status: "soon" },
      { label: "Flatten PDF", href: "/tools", status: "soon" },
    ],
  },
  {
    label: "Annotate",
    href: "/tools/highlight-pdf",
    items: [
      { label: "Highlight", href: "/tools/highlight-pdf", status: "beta" },
      { label: "Underline", href: "/tools/highlight-pdf", status: "soon" },
      { label: "Strikeout", href: "/tools/highlight-pdf", status: "soon" },
      { label: "Shapes", href: "/editor", status: "soon" },
      { label: "Freehand Draw", href: "/editor", status: "soon" },
    ],
  },
  {
    label: "Watermark",
    href: "/tools/watermark",
    items: [
      { label: "Add Watermark", href: "/tools/watermark", status: "soon" },
      { label: "Remove Watermark", href: "/tools", status: "soon" },
      { label: "Stamp PDF", href: "/tools", status: "soon" },
      { label: "Page Numbers", href: "/tools/page-numbers", status: "soon" },
    ],
  },
  {
    label: "Protect",
    href: "/tools/protect",
    items: [
      { label: "Protect PDF", href: "/tools/protect", status: "soon" },
      { label: "Unlock PDF", href: "/tools/unlock", status: "soon" },
      { label: "Redact PDF", href: "/tools/redact", status: "soon" },
      { label: "Secure Share", href: "/tools", status: "soon" },
    ],
  },
] as const;

function StatusDot({ status }: { status?: HeaderNavItem["status"] }) {
  if (!status) {
    return null;
  }

  const dotClassName =
    status === "live"
      ? "bg-emerald-500"
      : status === "beta"
        ? "bg-violet-500"
        : "bg-rose-400";

  return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />;
}

function DesktopNavButton({
  group,
  activeLabel,
  onOpen,
  onToggle,
}: {
  group: HeaderNavGroup;
  activeLabel: string | null;
  onOpen: (label: string) => void;
  onToggle: (label: string) => void;
}) {
  const pathname = usePathname();
  const isOpen = activeLabel === group.label;
  const isGroupLanding = pathname === group.href;
  const isDistinctToolRoute = group.items.some(
    (item) =>
      item.href !== group.href &&
      item.href !== "/tools" &&
      item.href.startsWith("/tools/") &&
      pathname === item.href,
  );
  const isActive = isGroupLanding || isDistinctToolRoute;

  return (
    <button
      type="button"
      onMouseEnter={() => onOpen(group.label)}
      onFocus={() => onOpen(group.label)}
      onClick={() => onToggle(group.label)}
      className={[
        "inline-flex min-h-11 items-center gap-1 border-b-2 px-0.5 text-[13px] font-semibold tracking-[-0.01em] transition duration-200",
        isActive || isOpen
          ? "border-violet-600 text-violet-700"
          : "border-transparent text-slate-600 hover:border-violet-300 hover:text-violet-700",
      ].join(" ")}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {group.label}
      <ChevronDown size={13} className={`transition duration-200 ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );
}

function DesktopCategoryTray({
  group,
}: {
  group: HeaderNavGroup;
}) {
  return (
    <div className="hidden border-t border-violet-100 bg-white/96 shadow-[0_18px_42px_rgba(76,47,209,0.08)] backdrop-blur-xl xl:block">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[88px] grid-cols-[220px_1fr] items-stretch">
          <Link
            href={group.href}
            className="group flex flex-col justify-center border-r border-violet-100 pr-6 transition"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500">
              {group.label} tools
            </span>
            <span className="mt-1.5 inline-flex items-center gap-2 text-[15px] font-semibold text-violet-800 transition group-hover:text-violet-950">
              Open {group.label}
              <ArrowRight size={15} />
            </span>
          </Link>

          <div
            className="grid items-stretch"
            style={{ gridTemplateColumns: `repeat(${group.items.length}, minmax(0, 1fr))` }}
          >
            {group.items.map((item) => (
              <Link
                key={`${group.label}-tray-${item.label}`}
                href={item.href}
                className="group flex min-h-[88px] items-center justify-between gap-3 border-r border-violet-100 px-5 text-sm font-semibold text-slate-700 transition last:border-r-0 hover:bg-violet-50/70 hover:text-violet-700"
              >
                <span className="flex items-center gap-2">
                  <StatusDot status={item.status} />
                  {item.label}
                </span>
                <ArrowRight size={14} className="shrink-0 text-violet-200 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileGroup, setExpandedMobileGroup] = useState<string | null>(CATEGORY_NAV[0].label);

  const accountLabel = useMemo(
    () => (pathname === "/dashboard" ? "My Account" : "Login / My Account"),
    [pathname],
  );

  const activeDesktopGroup = useMemo(
    () => CATEGORY_NAV.find((group) => group.label === activeGroup) ?? null,
    [activeGroup],
  );

  useEffect(() => {
    setActiveGroup(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function toggleDesktopGroup(label: string) {
    setActiveGroup((current) => (current === label ? null : label));
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-violet-100 bg-white/92 backdrop-blur-xl"
      onMouseLeave={() => setActiveGroup(null)}
    >
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[78px] items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <BrandMark className="h-11 w-11 shrink-0 transition duration-200 group-hover:-translate-y-0.5" />
            <div className="min-w-[194px]">
              <div className="display-font text-[1.72rem] font-medium leading-none tracking-[-0.045em] text-slate-950 transition duration-200 group-hover:text-violet-700">
                PDFMantra
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                <span className="h-px w-5 bg-gradient-to-r from-violet-500 to-rose-400" />
                Smart PDF Workspace
              </div>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 2xl:gap-5 xl:flex">
            {CATEGORY_NAV.map((group) => (
              <DesktopNavButton
                key={group.label}
                group={group}
                activeLabel={activeGroup}
                onOpen={setActiveGroup}
                onToggle={toggleDesktopGroup}
              />
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-4 xl:flex">
            <Link href="/pricing" className="text-[13px] font-semibold text-slate-600 transition hover:text-violet-700">
              Pricing
            </Link>
            <Link href="/desktop" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 transition hover:text-violet-700">
              Desktop
              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-rose-500">
                Soon
              </span>
            </Link>
            <Link href="/dashboard" className="text-[13px] font-semibold text-slate-600 transition hover:text-violet-700">
              {accountLabel}
            </Link>
            <Link
              href="/editor"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-4 text-[13px] font-semibold text-white shadow-[0_16px_38px_rgba(91,63,193,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(91,63,193,0.32)]"
            >
              <Sparkles size={14} />
              Start Editing
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-950 transition hover:border-violet-200 hover:text-violet-700 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {activeDesktopGroup ? <DesktopCategoryTray group={activeDesktopGroup} /> : null}

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[79px] z-40 h-[calc(100vh-79px)] overflow-y-auto border-t border-violet-100 bg-white px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-0 overflow-hidden rounded-[1.8rem] border border-violet-100 bg-white">
              {CATEGORY_NAV.map((group) => {
                const expanded = expandedMobileGroup === group.label;

                return (
                  <div key={group.label} className="border-b border-violet-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileGroup(expanded ? null : group.label)}
                      className="flex w-full items-center justify-between px-4 py-4 text-left text-base font-semibold text-slate-950"
                    >
                      {group.label}
                      <ChevronDown size={16} className={`text-violet-600 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>

                    {expanded ? (
                      <div className="border-t border-violet-100 bg-violet-50/45 px-3 py-2">
                        <Link href={group.href} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-violet-800">
                          Open {group.label}
                          <ArrowRight size={15} />
                        </Link>
                        {group.items.map((item) => (
                          <Link
                            key={`${group.label}-mobile-${item.label}`}
                            href={item.href}
                            className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-violet-700"
                          >
                            <span className="flex items-center gap-2">
                              <StatusDot status={item.status} />
                              {item.label}
                            </span>
                            <ArrowRight size={14} className="text-violet-300" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-0 overflow-hidden rounded-[1.8rem] border border-violet-100 bg-white sm:grid-cols-3">
              <Link href="/pricing" className="border-b border-violet-100 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 sm:border-b-0 sm:border-r">
                Pricing
              </Link>
              <Link href="/desktop" className="border-b border-violet-100 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 sm:border-b-0 sm:border-r">
                Desktop App · Soon
              </Link>
              <Link href="/dashboard" className="px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
                Login / My Account
              </Link>
            </div>

            <Link
              href="/editor"
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-6 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(91,63,193,0.24)]"
            >
              <Sparkles size={15} />
              Start Editing
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
