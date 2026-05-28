"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { HeaderAuthLinks, MobileHeaderAuthLink } from "@/components/auth/HeaderAuthLinks";
import { TOOL_CATEGORIES, tools, type Tool } from "@/lib/tools";

const PRIMARY_NAV = [
  { label: "MERGE PDF", href: "/tools/merge" },
  { label: "SPLIT PDF", href: "/tools/split" },
  { label: "COMPRESS PDF", href: "/tools/compress" },
] as const;

const SUPPORT_NAV = [
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
] as const;

function isConvertTool(title: string) {
  return title.toLowerCase().includes("pdf") && title.toLowerCase().includes("to");
}

function isPublicTool(tool: Tool) {
  return tool.status === "working" && tool.visibility.showInMegaMenu;
}

function DotGridIcon() {
  return (
    <span className="grid h-5 w-5 grid-cols-3 gap-1" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-current" />
      ))}
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const featuredTools = useMemo(
    () => tools.filter(isPublicTool).slice(0, 24),
    [],
  );

  const convertTools = useMemo(
    () => featuredTools.filter((tool) => isConvertTool(tool.title)).slice(0, 8),
    [featuredTools],
  );

  const groupedTools = useMemo(
    () =>
      TOOL_CATEGORIES.map((category) => ({
        label: category.menuLabel,
        tools: tools
          .filter((tool) => tool.category === category.id && isPublicTool(tool))
          .slice(0, 6),
      })).filter((group) => group.tools.length > 0),
    [],
  );

  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/96 backdrop-blur-xl">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[64px] items-center justify-between gap-4 sm:min-h-[72px]">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <BrandMark className="h-9 w-9 shrink-0 transition duration-200 group-hover:-translate-y-0.5 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <div className="display-font truncate text-[1.35rem] font-semibold leading-none tracking-[-0.035em] text-slate-950 transition duration-200 group-hover:text-violet-700 sm:text-[1.58rem]">
                PDFMantra
              </div>
              <div className="mt-1 hidden items-center gap-2 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500 min-[390px]:flex sm:text-[9px] sm:tracking-[0.22em]">
                <span className="h-px w-4 bg-gradient-to-r from-violet-500 via-violet-400 to-violet-200 sm:w-5" />
                Smart PDF Workspace
              </div>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-7 xl:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent px-0.5 text-[13px] font-bold uppercase tracking-[-0.01em] text-slate-800 transition duration-200 hover:border-violet-300 hover:text-violet-700"
              >
                {item.label}
              </Link>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((current) => !current)}
                className="inline-flex min-h-11 items-center gap-1 border-b-2 border-transparent px-0.5 text-[13px] font-bold uppercase tracking-[-0.01em] text-slate-800 transition duration-200 hover:border-violet-300 hover:text-violet-700"
                aria-expanded={toolsOpen}
              >
                All PDF Tools
                <ChevronDown size={13} className={`transition ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsOpen ? (
                <div className="absolute left-1/2 top-full z-50 mt-3 w-[760px] -translate-x-1/2 rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-[0_24px_64px_rgba(76,47,209,0.12)]">
                  <div className="grid gap-5 md:grid-cols-3">
                    <div>
                      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Convert
                      </p>
                      <div className="space-y-1">
                        {convertTools.map((tool) => (
                          <Link
                            key={tool.id}
                            href={tool.href}
                            className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                          >
                            {tool.title}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {groupedTools.slice(0, 2).map((group) => (
                      <div key={group.label}>
                        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {group.label}
                        </p>
                        <div className="space-y-1">
                          {group.tools.map((tool) => (
                            <Link
                              key={tool.id}
                              href={tool.href}
                              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                            >
                              {tool.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </nav>

          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <HeaderAuthLinks />
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-800">
              <DotGridIcon />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-950 transition hover:border-violet-200 hover:text-violet-700 sm:h-11 sm:w-11 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-[65px] z-40 h-[calc(100vh-65px)] overflow-y-auto border-t border-violet-100 bg-[var(--bg-base)] px-4 py-5 sm:top-[73px] sm:h-[calc(100vh-73px)] xl:hidden">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white sm:rounded-[1.8rem]">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-base font-bold text-slate-950 transition hover:bg-violet-50 hover:text-violet-700 last:border-b-0"
                >
                  {item.label}
                </Link>
              ))}

              <Link
                href="/tools"
                className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-base font-bold text-slate-950 transition hover:bg-violet-50 hover:text-violet-700"
              >
                All PDF Tools
              </Link>

              {SUPPORT_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 last:border-b-0"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white sm:rounded-[1.8rem]">
              <MobileHeaderAuthLink />
            </div>

            <Link href="/editor" className="header-cta min-h-14 w-full px-6 text-sm">
              <span>Start Editing</span>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
