"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  CloudCog,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import {
  HeaderAuthLinks,
  MobileHeaderAuthLink,
} from "@/components/auth/HeaderAuthLinks";
import {
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
  getHomepagePopularTools,
  resolveHomepageTools,
} from "@/lib/home/homepage-tools";
import { getToolById, tools, type Tool } from "@/lib/tools";

const PRIMARY_NAV = [
  { label: "Edit PDF", href: "/editor" },
  { label: "Organize", href: "/tools/reorder" },
  { label: "Convert", href: "/#tool-explorer" },
  { label: "Sign", href: "/tools/fill-sign" },
  { label: "Compress", href: "/tools/compress" },
] as const;

type HeaderToolGroup = {
  readonly label: string;
  readonly tools: readonly Tool[];
};

function conversionTools(ids: readonly string[], label: string) {
  return ids.map((id) => {
    const tool = getToolById(id);
    if (!tool) {
      throw new Error(`[header] Missing canonical tool "${id}" in ${label}.`);
    }
    return tool;
  });
}

function HeaderToolLink({
  tool,
  onClick,
}: {
  readonly tool: Tool;
  readonly onClick?: () => void;
}) {
  const Icon = tool.icon;
  const provider = tool.capabilities.needsBackendProcessing;

  return (
    <Link
      href={tool.href}
      role="menuitem"
      onClick={onClick}
      className="group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-100"
    >
      <Icon size={15} className="shrink-0 text-violet-600" />
      <span className="min-w-0 flex-1 truncate">
        {tool.shortTitle ?? tool.title}
      </span>
      {provider ? (
        <CloudCog
          size={13}
          className="shrink-0 text-blue-600"
          aria-label="Secure provider"
        />
      ) : null}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);

  const toolGroups = useMemo<readonly HeaderToolGroup[]>(() => {
    const fromPdf = getHomepageConversionsFromPdf();
    const toPdf = getHomepageConversionsToPdf();
    return [
      {
        label: "Popular",
        tools: getHomepagePopularTools().slice(0, 6),
      },
      {
        label: "Edit & Sign",
        tools: tools
          .filter((tool) => tool.category === "edit")
          .slice(0, 6),
      },
      {
        label: "Organize",
        tools: tools
          .filter((tool) => tool.category === "organize")
          .slice(0, 6),
      },
      {
        label: "Convert from PDF",
        tools: conversionTools(
          fromPdf.slice(0, 6).map((item) => item.id),
          "Convert from PDF",
        ),
      },
      {
        label: "Convert to PDF",
        tools: conversionTools(
          toPdf.slice(0, 6).map((item) => item.id),
          "Convert to PDF",
        ),
      },
      {
        label: "Optimize",
        tools: tools
          .filter((tool) => tool.category === "optimize")
          .slice(0, 6),
      },
      {
        label: "OCR & Smart Tools",
        tools: resolveHomepageTools(
          ["pdf-to-searchable-pdf", "pdf-to-text", "pdf-to-html", "pdf-editor"],
          "Header OCR & Smart Tools",
        ),
      },
      {
        label: "Security",
        tools: tools
          .filter((tool) => tool.category === "security")
          .slice(0, 6),
      },
    ];
  }, []);

  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen) return;

    function closeAndRestoreFocus() {
      setToolsOpen(false);
      toolsTriggerRef.current?.focus();
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !toolsMenuRef.current?.contains(target) &&
        !toolsTriggerRef.current?.contains(target)
      ) {
        closeAndRestoreFocus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolsOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (mobileOpen) {
      requestAnimationFrame(() => {
        mobilePanelRef.current
          ?.querySelector<HTMLElement>("a, button")
          ?.focus();
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleMobileKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileOpen(false);
      mobileTriggerRef.current?.focus();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/96 backdrop-blur-xl">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[68px] items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2"
            aria-label="PDFMantra home"
          >
            <BrandMark className="h-9 w-9 shrink-0 transition group-hover:-translate-y-0.5" />
            <div className="min-w-0">
              <div className="display-font truncate text-xl font-bold leading-none tracking-[-0.04em] text-slate-950">
                PDFMantra
              </div>
              <div className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">
                PDF command center
              </div>
            </div>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
            aria-label="Primary navigation"
          >
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
              >
                {item.label}
              </Link>
            ))}

            <div className="relative">
              <button
                ref={toolsTriggerRef}
                type="button"
                onClick={() => setToolsOpen((current) => !current)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls="header-tools-menu"
              >
                All PDF Tools
                <ChevronDown
                  size={14}
                  className={`transition ${toolsOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <Link
              href="/#tool-explorer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
              aria-label="Search PDF tools"
            >
              <Search size={18} />
            </Link>
            <HeaderAuthLinks />
            <Link href="/editor" className="header-cta min-h-11 px-4 text-xs">
              Open Editor
            </Link>
          </div>

          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-950 transition hover:border-violet-300 hover:text-violet-700 xl:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {toolsOpen ? (
        <div
          id="header-tools-menu"
          ref={toolsMenuRef}
          role="menu"
          aria-label="All PDF tools"
          className="absolute inset-x-0 top-full hidden border-y border-violet-100 bg-white shadow-[0_28px_70px_rgba(36,25,86,0.15)] xl:block"
        >
          <div className="mx-auto grid max-h-[calc(100vh-90px)] max-w-[1320px] grid-cols-4 gap-x-6 gap-y-7 overflow-y-auto px-8 py-7">
            {toolGroups.map((group) => (
              <div key={group.label}>
                <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.tools.map((tool) => (
                    <HeaderToolLink
                      key={tool.id}
                      tool={tool}
                      onClick={() => setToolsOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="PDFMantra navigation"
          onKeyDown={handleMobileKeyDown}
          className="fixed inset-x-0 top-[69px] z-40 h-[calc(100dvh-69px)] overflow-y-auto border-t border-violet-100 bg-[#f8f7fd] px-4 py-5 xl:hidden"
        >
          <div className="mx-auto max-w-3xl pb-8">
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-14 items-center justify-between border-b border-violet-100 px-4 text-base font-bold text-slate-900 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  {item.label}
                  <ArrowRight size={16} />
                </Link>
              ))}
              <Link
                href="/tools"
                className="flex min-h-14 items-center justify-between px-4 text-base font-bold text-slate-900 transition hover:bg-violet-50 hover:text-violet-700"
              >
                All PDF Tools
                <ArrowRight size={16} />
              </Link>
            </div>

            <Link
              href="/#tool-explorer"
              className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-violet-100 bg-white px-4 text-sm font-bold text-violet-700"
            >
              <Search size={17} />
              Search PDF tools
            </Link>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {toolGroups.map((group) => (
                <div
                  key={group.label}
                  className="rounded-2xl border border-violet-100 bg-white p-3"
                >
                  <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </p>
                  {group.tools.slice(0, 5).map((tool) => (
                    <HeaderToolLink key={tool.id} tool={tool} />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-white">
              <MobileHeaderAuthLink />
            </div>
            <Link href="/editor" className="header-cta mt-4 min-h-14 w-full">
              Open PDF Editor
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
