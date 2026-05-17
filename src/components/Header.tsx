"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Grid3X3,
  Menu,
  Sparkles,
  X,
  BadgeDollarSign,
  ShieldCheck,
  Shapes,
  Info,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { TOOL_CATEGORIES, tools, type Tool } from "@/lib/tools";
import { useEffect, useMemo, useState } from "react";

type HeaderTray = "convert" | "tools" | "utility" | null;

const PRIMARY_NAV = [
  { label: "Merge PDF", href: "/tools/merge" },
  { label: "Split PDF", href: "/tools/split" },
  { label: "Compress PDF", href: "/tools/compress" },
] as const;

const UTILITY_LINKS = [
  {
    label: "Pricing",
    href: "/pricing",
    description: "Plans and product access",
    icon: BadgeDollarSign,
  },
  {
    label: "Security",
    href: "/security",
    description: "Trust and document protection",
    icon: ShieldCheck,
  },
  {
    label: "Features",
    href: "/features",
    description: "What PDFMantra helps you do",
    icon: Shapes,
  },
  {
    label: "About us",
    href: "/about",
    description: "The product story and direction",
    icon: Info,
  },
] as const;

function isConvertToPdf(tool: Tool): boolean {
  const title = tool.title.toLowerCase();
  return title.includes("to pdf") && !title.startsWith("pdf to");
}

function isConvertFromPdf(tool: Tool): boolean {
  return tool.title.toLowerCase().startsWith("pdf to");
}

function TrayLink({ tool }: { readonly tool: Tool }) {
  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-violet-600 shadow-[0_1px_3px_rgba(24,21,46,0.06)] transition group-hover:border-violet-200 group-hover:bg-violet-50">
        <Icon size={15} />
      </span>
      <span className="truncate">{tool.title}</span>
    </Link>
  );
}

function ConvertTray({ toPdfTools, fromPdfTools }: { readonly toPdfTools: readonly Tool[]; readonly fromPdfTools: readonly Tool[] }) {
  return (
    <div className="hidden border-t border-violet-100 bg-white/96 shadow-[0_20px_48px_rgba(76,47,209,0.08)] backdrop-blur-xl xl:block">
      <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-fit min-w-[640px] rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-[0_16px_48px_rgba(76,47,209,0.08)]">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Convert to PDF
              </div>
              <div className="space-y-0.5">
                {toPdfTools.length > 0 ? toPdfTools.map((tool) => <TrayLink key={tool.id} tool={tool} />) : null}
              </div>
            </div>

            <div className="border-l border-violet-100 pl-5">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Convert from PDF
              </div>
              <div className="space-y-0.5">
                {fromPdfTools.length > 0 ? fromPdfTools.map((tool) => <TrayLink key={tool.id} tool={tool} />) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllToolsTray({ groupedTools }: { readonly groupedTools: readonly { label: string; tools: Tool[] }[] }) {
  return (
    <div className="hidden border-t border-violet-100 bg-white/96 shadow-[0_20px_48px_rgba(76,47,209,0.08)] backdrop-blur-xl xl:block">
      <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-[0_18px_56px_rgba(76,47,209,0.09)]">
          <div className="grid gap-5 xl:grid-cols-5">
            {groupedTools.map((group) => (
              <div key={group.label} className="min-w-0">
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.tools.slice(0, 7).map((tool) => (
                    <TrayLink key={tool.id} tool={tool} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UtilityTray() {
  return (
    <div className="hidden border-t border-violet-100 bg-white/96 shadow-[0_20px_48px_rgba(76,47,209,0.08)] backdrop-blur-xl xl:block">
      <div className="mx-auto flex max-w-[1480px] justify-end px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-[520px] rounded-[1.6rem] border border-violet-100 bg-white p-4 shadow-[0_18px_56px_rgba(76,47,209,0.1)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {UTILITY_LINKS.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group rounded-[1.25rem] border border-violet-100 bg-violet-50/35 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:shadow-[0_14px_28px_rgba(101,80,232,0.08)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-[0_1px_3px_rgba(24,21,46,0.06)]">
                    <Icon size={18} />
                  </div>
                  <div className="mt-3 text-sm font-bold tracking-[-0.01em] text-slate-950 transition group-hover:text-violet-700">
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopTrayButton({
  label,
  tray,
  activeTray,
  onOpen,
  onToggle,
}: {
  readonly label: string;
  readonly tray: Exclude<HeaderTray, null>;
  readonly activeTray: HeaderTray;
  readonly onOpen: (tray: Exclude<HeaderTray, null>) => void;
  readonly onToggle: (tray: Exclude<HeaderTray, null>) => void;
}) {
  const isOpen = activeTray === tray;

  return (
    <button
      type="button"
      onMouseEnter={() => onOpen(tray)}
      onFocus={() => onOpen(tray)}
      onClick={() => onToggle(tray)}
      className={[
        "inline-flex min-h-11 items-center gap-1 border-b-2 px-0.5 text-[13px] font-bold tracking-[-0.01em] transition duration-200",
        isOpen
          ? "border-violet-600 text-violet-700"
          : "border-transparent text-slate-700 hover:border-violet-300 hover:text-violet-700",
      ].join(" ")}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {label}
      <ChevronDown size={13} className={`transition duration-200 ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );
}

export function Header() {
  const pathname = usePathname();
  const [activeTray, setActiveTray] = useState<HeaderTray>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileConvertOpen, setMobileConvertOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileUtilityOpen, setMobileUtilityOpen] = useState(false);

  const accountLabel = useMemo(
    () => (pathname === "/dashboard" ? "My Account" : "Login / My Account"),
    [pathname],
  );

  const convertTools = useMemo(
    () => tools.filter((tool) => tool.category === "convert" && tool.visibility.showInMegaMenu),
    [],
  );

  const toPdfTools = useMemo(
    () => convertTools.filter(isConvertToPdf),
    [convertTools],
  );

  const fromPdfTools = useMemo(
    () => convertTools.filter(isConvertFromPdf),
    [convertTools],
  );

  const groupedTools = useMemo(
    () =>
      TOOL_CATEGORIES.map((category) => ({
        label: category.menuLabel,
        tools: tools.filter(
          (tool) => tool.category === category.id && tool.visibility.showInMegaMenu,
        ),
      })).filter((group) => group.tools.length > 0),
    [],
  );

  useEffect(() => {
    setActiveTray(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function toggleTray(tray: Exclude<HeaderTray, null>) {
    setActiveTray((current) => (current === tray ? null : tray));
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-violet-100 bg-[var(--bg-base)]/94 backdrop-blur-xl"
      onMouseLeave={() => setActiveTray(null)}
    >
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[78px] items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <BrandMark className="h-11 w-11 shrink-0 transition duration-200 group-hover:-translate-y-0.5" />
            <div className="min-w-[194px]">
              <div className="display-font text-[1.72rem] font-semibold leading-none tracking-[-0.035em] text-slate-950 transition duration-200 group-hover:text-violet-700">
                PDFMantra
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <span className="h-px w-5 bg-gradient-to-r from-violet-500 via-violet-400 to-violet-200" />
                Smart PDF Workspace
              </div>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-7 xl:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex min-h-11 items-center border-b-2 border-transparent px-0.5 text-[13px] font-bold tracking-[-0.01em] text-slate-700 transition duration-200 hover:border-violet-300 hover:text-violet-700"
              >
                {item.label}
              </Link>
            ))}

            <DesktopTrayButton
              label="Convert PDF"
              tray="convert"
              activeTray={activeTray}
              onOpen={setActiveTray}
              onToggle={toggleTray}
            />

            <DesktopTrayButton
              label="All PDF Tools"
              tray="tools"
              activeTray={activeTray}
              onOpen={setActiveTray}
              onToggle={toggleTray}
            />
          </nav>

          <div className="hidden shrink-0 items-center gap-4 xl:flex">
            <Link href="/dashboard" className="text-[13px] font-bold text-slate-700 transition hover:text-violet-700">
              {accountLabel}
            </Link>
            <Link href="/editor" className="header-cta min-h-11 px-4 text-[13px]">
              <Sparkles size={14} />
              <span>Start Editing</span>
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onMouseEnter={() => setActiveTray("utility")}
              onFocus={() => setActiveTray("utility")}
              onClick={() => toggleTray("utility")}
              className={[
                "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
                activeTray === "utility"
                  ? "border-violet-300 bg-violet-50 text-violet-700"
                  : "border-violet-100 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
              ].join(" ")}
              aria-label="Open quick links"
              aria-expanded={activeTray === "utility"}
            >
              <Grid3X3 size={19} />
            </button>
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

      {activeTray === "convert" ? <ConvertTray toPdfTools={toPdfTools} fromPdfTools={fromPdfTools} /> : null}
      {activeTray === "tools" ? <AllToolsTray groupedTools={groupedTools} /> : null}
      {activeTray === "utility" ? <UtilityTray /> : null}

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[79px] z-40 h-[calc(100vh-79px)] overflow-y-auto border-t border-violet-100 bg-[var(--bg-base)] px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="overflow-hidden rounded-[1.8rem] border border-violet-100 bg-white">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-base font-bold text-slate-950 transition hover:bg-violet-50 hover:text-violet-700 last:border-b-0"
                >
                  {item.label}
                  <ArrowRight size={16} className="text-violet-400" />
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setMobileConvertOpen((current) => !current)}
                className="flex w-full items-center justify-between border-t border-violet-100 px-4 py-4 text-left text-base font-bold text-slate-950"
              >
                Convert PDF
                <ChevronDown size={16} className={`text-violet-600 transition ${mobileConvertOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileConvertOpen ? (
                <div className="grid gap-4 border-t border-violet-100 bg-violet-50/38 px-3 py-3 sm:grid-cols-2">
                  <div>
                    <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Convert to PDF
                    </div>
                    {toPdfTools.map((tool) => <TrayLink key={`mobile-to-${tool.id}`} tool={tool} />)}
                  </div>
                  <div>
                    <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Convert from PDF
                    </div>
                    {fromPdfTools.map((tool) => <TrayLink key={`mobile-from-${tool.id}`} tool={tool} />)}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setMobileToolsOpen((current) => !current)}
                className="flex w-full items-center justify-between border-t border-violet-100 px-4 py-4 text-left text-base font-bold text-slate-950"
              >
                All PDF Tools
                <ChevronDown size={16} className={`text-violet-600 transition ${mobileToolsOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileToolsOpen ? (
                <div className="border-t border-violet-100 bg-violet-50/38 px-3 py-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupedTools.map((group) => (
                      <div key={`mobile-group-${group.label}`}>
                        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {group.label}
                        </div>
                        {group.tools.slice(0, 6).map((tool) => (
                          <TrayLink key={`mobile-tool-${tool.id}`} tool={tool} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[1.8rem] border border-violet-100 bg-white">
              <Link href="/dashboard" className="flex items-center justify-between border-b border-violet-100 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
                {accountLabel}
                <ArrowRight size={15} />
              </Link>

              <button
                type="button"
                onClick={() => setMobileUtilityOpen((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold text-slate-700"
              >
                More PDFMantra
                <ChevronDown size={16} className={`text-violet-600 transition ${mobileUtilityOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileUtilityOpen ? (
                <div className="grid gap-3 border-t border-violet-100 bg-violet-50/38 p-3 sm:grid-cols-2">
                  {UTILITY_LINKS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={`mobile-utility-${item.label}`}
                        href={item.href}
                        className="rounded-[1.25rem] border border-violet-100 bg-white p-4 text-slate-950 transition hover:border-violet-200 hover:bg-violet-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">
                          <Icon size={18} />
                        </div>
                        <div className="mt-3 text-sm font-bold">{item.label}</div>
                        <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{item.description}</div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <Link href="/editor" className="header-cta min-h-14 w-full px-6 text-sm">
              <Sparkles size={15} />
              <span>Start Editing</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
