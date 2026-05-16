"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  CATEGORY_MENU_LABELS,
  STATUS_CONFIG,
  getPopularTools,
  getToolMenuGroups,
  searchTools,
  type Tool,
  type ToolCategory,
} from "@/lib/tools";
import { useEffect, useMemo, useRef, useState } from "react";

const TOOL_MENU_GROUPS = getToolMenuGroups();
const POPULAR_TOOLS = getPopularTools(6);
const DEFAULT_CATEGORY: ToolCategory = "edit";

const PRIMARY_SHORTCUTS = [
  {
    label: "Edit PDF",
    href: "/editor",
  },
  {
    label: "Merge",
    href: "/tools/merge",
  },
  {
    label: "Compress",
    href: "/tools/compress",
  },
  {
    label: "Sign",
    href: "/editor",
  },
] as const;

function getToolStatusLabel(tool: Tool) {
  return STATUS_CONFIG[tool.status];
}

function ToolRow({
  tool,
  onNavigate,
  compact = false,
}: {
  tool: Tool;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = tool.icon;
  const status = getToolStatusLabel(tool);

  return (
    <Link
      href={tool.href}
      onClick={onNavigate}
      className={[
        "group flex w-full items-start gap-3 rounded-[1.4rem] border border-transparent transition duration-200",
        compact
          ? "px-3 py-3 hover:border-[#ddcfbf] hover:bg-[#fffaf3]"
          : "px-4 py-4 hover:border-[#ddcfbf] hover:bg-[#fffaf3]",
      ].join(" ")}
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-2xl border border-[#d9cbb9] bg-[#f0f3eb] text-[#526047] transition duration-200 group-hover:border-[#cfbea9] group-hover:bg-white",
          compact ? "h-10 w-10" : "h-11 w-11",
        ].join(" ")}
      >
        <Icon size={compact ? 18 : 19} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tracking-[-0.02em] text-[#2f271f] transition group-hover:text-[#394432]">
            {tool.title}
          </span>

          {tool.newTool ? (
            <span className="rounded-full bg-[#f2e2d5] px-2.5 py-1 text-[11px] font-semibold text-[#986447]">
              New
            </span>
          ) : null}

          <span className={status.className}>{status.label}</span>
        </div>

        <p
          className={[
            "mt-1.5 max-w-xl text-sm leading-6 text-[#78695b]",
            compact ? "line-clamp-2" : "",
          ].join(" ")}
        >
          {tool.menuDescription}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="mt-1 shrink-0 text-[#c7b8a6] transition duration-200 group-hover:translate-x-0.5 group-hover:text-[#526047]"
      />
    </Link>
  );
}

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#ddcfbf] bg-[#fbf7f0] px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ddcfbf] bg-[#fffaf3] text-[#78695b] shadow-sm">
        <Search size={20} />
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-[-0.03em] text-[#2f271f]">
        No strong tool match found
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[#78695b]">
        We could not find a close match for{" "}
        <span className="font-semibold text-[#2f271f]">“{query}”</span>. Try
        merge, sign, compress, OCR, protect, or images to PDF.
      </p>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ToolCategory>(DEFAULT_CATEGORY);

  const normalizedQuery = searchQuery.trim();

  const activeGroup = useMemo(
    () =>
      TOOL_MENU_GROUPS.find(
        (group) => group.category === activeCategory,
      ) ?? TOOL_MENU_GROUPS[0],
    [activeCategory],
  );

  const toolSearchResults = useMemo(
    () =>
      normalizedQuery
        ? searchTools(normalizedQuery, {
            includeComingSoon: true,
            limit: 10,
          })
        : [],
    [normalizedQuery],
  );

  const matchedTools = useMemo(
    () => toolSearchResults.map((result) => result.tool),
    [toolSearchResults],
  );

  function closeAllMenus() {
    setToolsMenuOpen(false);
    setMobileMenuOpen(false);
    setSearchQuery("");
    setActiveCategory(DEFAULT_CATEGORY);
  }

  function openToolsMenu() {
    setToolsMenuOpen(true);
    setMobileMenuOpen(false);

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);
  }

  function toggleToolsMenu() {
    if (toolsMenuOpen) {
      closeAllMenus();
      return;
    }

    openToolsMenu();
  }

  useEffect(() => {
    closeAllMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!toolsMenuOpen) {
        return;
      }

      const target = event.target as Node;

      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(target)
      ) {
        setToolsMenuOpen(false);
        setSearchQuery("");
        setActiveCategory(DEFAULT_CATEGORY);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#ddcfbf]/90 bg-[#fffaf3]/92 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[#ddcfbf] bg-gradient-to-br from-[#394432] via-[#526047] to-[#8e6b4d] text-[#fffaf3] shadow-[0_16px_34px_rgba(57,68,50,0.24)] transition duration-200 group-hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
            <FileText size={21} className="relative" />
          </div>

          <div className="leading-tight">
            <div className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-none tracking-[-0.045em] text-[#2f271f]">
              PDFMantra
            </div>
            <div className="mt-0.5 text-xs font-medium tracking-wide text-[#78695b]">
              Editorial PDF Workspace
            </div>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          <div ref={desktopMenuRef} className="relative">
            <button
              type="button"
              onClick={toggleToolsMenu}
              aria-expanded={toolsMenuOpen}
              aria-haspopup="dialog"
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
                toolsMenuOpen
                  ? "border-[#cfbea9] bg-[#f0f3eb] text-[#394432]"
                  : "border-[#ddcfbf] bg-[#fffaf3] text-[#4e4439] hover:border-[#cfbea9] hover:bg-white hover:text-[#394432]",
              ].join(" ")}
            >
              All Tools
              <ChevronDown
                size={15}
                className={[
                  "transition duration-200",
                  toolsMenuOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {toolsMenuOpen ? (
              <div className="absolute left-1/2 top-[calc(100%+0.9rem)] flex max-h-[calc(100vh-6.25rem)] w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[2.1rem] border border-[#ddcfbf] bg-[#fffaf3] shadow-[0_44px_120px_rgba(54,45,36,0.28)]">
                <div className="shrink-0 border-b border-[#ddcfbf] bg-[#f6f0e7] px-6 py-5">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                        Tool Discovery
                      </p>
                      <h2 className="mt-1 text-3xl leading-none text-[#2f271f]">
                        Find the right PDFMantra tool instantly
                      </h2>
                    </div>

                    <Link
                      href="/tools"
                      onClick={closeAllMenus}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ddcfbf] bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-[#2f271f] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfbea9] hover:text-[#394432] hover:shadow-md"
                    >
                      View all tools
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <label className="mt-5 flex min-h-14 items-center gap-3 rounded-[1.35rem] border border-[#cfbea9] bg-[#fffaf3] px-4 shadow-sm transition focus-within:border-[#526047] focus-within:ring-4 focus-within:ring-[#e5eadf]">
                    <Search size={19} className="shrink-0 text-[#9b8c7a]" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search merge, sign, compress, OCR, password, images to PDF..."
                      className="w-full bg-transparent text-sm font-medium text-[#2f271f] outline-none placeholder:text-[#9b8c7a]"
                    />
                    {normalizedQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe5d8] text-[#78695b] transition hover:bg-[#e6d8c6] hover:text-[#2f271f]"
                        aria-label="Clear tool search"
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </label>
                </div>

                {normalizedQuery ? (
                  <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] overflow-hidden bg-[#fffaf3]">
                    <div className="min-h-0 overflow-y-auto border-r border-[#ddcfbf] px-5 py-5">
                      <div className="mb-3 flex items-center justify-between px-2">
                        <p className="text-sm font-semibold text-[#2f271f]">
                          Search results
                        </p>
                        <span className="text-xs font-semibold text-[#78695b]">
                          {matchedTools.length} match
                          {matchedTools.length === 1 ? "" : "es"}
                        </span>
                      </div>

                      {matchedTools.length > 0 ? (
                        <div className="space-y-1">
                          {matchedTools.map((tool) => (
                            <ToolRow
                              key={tool.id}
                              tool={tool}
                              onNavigate={closeAllMenus}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptySearchState query={normalizedQuery} />
                      )}
                    </div>

                    <aside className="min-h-0 overflow-y-auto bg-[#f6f0e7] px-5 py-5">
                      <div className="rounded-[1.75rem] border border-[#ddcfbf] bg-[#fffaf3] p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                          Search Intelligence
                        </p>

                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#2f271f]">
                          Try natural intent words
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#78695b]">
                          PDFMantra understands searches such as:
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {[
                            "combine files",
                            "reduce PDF size",
                            "scan text",
                            "add signature",
                            "unlock PDF",
                            "images to PDF",
                          ].map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setSearchQuery(item)}
                              className="rounded-full border border-[#d9cbb9] bg-[#f0f3eb] px-3 py-2 text-xs font-semibold text-[#526047] transition hover:border-[#cfbea9] hover:bg-[#e5eadf]"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : (
                  <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px] overflow-hidden bg-[#fffaf3]">
                    <aside className="min-h-0 overflow-y-auto border-r border-[#ddcfbf] bg-[#f6f0e7] px-4 py-5">
                      <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8b7b68]">
                        Categories
                      </p>

                      <div className="mt-3 space-y-1">
                        {TOOL_MENU_GROUPS.map((group) => (
                          <button
                            key={group.category}
                            type="button"
                            onClick={() => setActiveCategory(group.category)}
                            className={[
                              "w-full rounded-[1.35rem] px-3 py-3 text-left transition duration-200",
                              activeCategory === group.category
                                ? "border border-[#ddcfbf] bg-[#fffaf3] text-[#394432] shadow-sm"
                                : "border border-transparent text-[#78695b] hover:border-[#ddcfbf] hover:bg-[#fffaf3] hover:text-[#2f271f]",
                            ].join(" ")}
                          >
                            <div className="text-sm font-semibold">
                              {CATEGORY_MENU_LABELS[group.category]}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#8b7b68]">
                              {group.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </aside>

                    <section className="min-h-0 overflow-y-auto px-5 py-5">
                      <div className="mb-3 px-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                          {activeGroup?.label}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#2f271f]">
                          {activeGroup?.description}
                        </h3>
                      </div>

                      <div className="space-y-1">
                        {activeGroup?.tools.map((tool) => (
                          <ToolRow
                            key={tool.id}
                            tool={tool}
                            onNavigate={closeAllMenus}
                          />
                        ))}
                      </div>
                    </section>

                    <aside className="min-h-0 overflow-y-auto border-l border-[#ddcfbf] bg-[#f6f0e7] px-5 py-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                          Popular
                        </p>

                        <Sparkles size={16} className="text-[#b77b59]" />
                      </div>

                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#2f271f]">
                        Quick starts
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#78695b]">
                        High-demand PDFMantra workflows surfaced first for
                        faster discovery.
                      </p>

                      <div className="mt-4 space-y-1 rounded-[1.75rem] border border-[#ddcfbf] bg-[#fffaf3] p-2 shadow-sm">
                        {POPULAR_TOOLS.map((tool) => (
                          <ToolRow
                            key={tool.id}
                            tool={tool}
                            onNavigate={closeAllMenus}
                            compact
                          />
                        ))}
                      </div>
                    </aside>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {PRIMARY_SHORTCUTS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200",
                  isActive
                    ? "bg-[#f0f3eb] text-[#394432]"
                    : "text-[#5e5144] hover:bg-[#f6f0e7] hover:text-[#394432]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <Link
            href="/pricing"
            className={[
              "inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200",
              pathname === "/pricing"
                ? "bg-[#f0f3eb] text-[#394432]"
                : "text-[#5e5144] hover:bg-[#f6f0e7] hover:text-[#394432]",
            ].join(" ")}
          >
            Pricing
          </Link>

          <Link
            href="/dashboard"
            className={[
              "inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200",
              pathname === "/dashboard"
                ? "bg-[#f0f3eb] text-[#394432]"
                : "text-[#5e5144] hover:bg-[#f6f0e7] hover:text-[#394432]",
            ].join(" ")}
          >
            Dashboard
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/editor"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#394432] to-[#526047] px-4 py-2 text-sm font-semibold text-[#fffaf3] shadow-[0_18px_40px_rgba(57,68,50,0.24)] transition duration-200 hover:-translate-y-0.5 hover:from-[#2f392a] hover:to-[#46533d] sm:inline-flex"
          >
            <Sparkles size={15} />
            Open Editor
            <ArrowRight size={15} />
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((current) => !current);
              setToolsMenuOpen(false);
              setSearchQuery("");
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ddcfbf] bg-[#fffaf3] text-[#2f271f] shadow-sm transition hover:border-[#cfbea9] hover:text-[#394432] xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[69px] z-40 h-[calc(100vh-69px)] overflow-y-auto border-t border-[#ddcfbf] bg-[#fffaf3] px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIMARY_SHORTCUTS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="rounded-[1.45rem] border border-[#ddcfbf] bg-[#fffaf3] px-4 py-4 text-sm font-semibold text-[#2f271f] shadow-sm transition hover:border-[#cfbea9] hover:text-[#394432]"
                >
                  {item.label}
                </Link>
              ))}

              <Link
                href="/pricing"
                onClick={closeAllMenus}
                className="rounded-[1.45rem] border border-[#ddcfbf] bg-[#fffaf3] px-4 py-4 text-sm font-semibold text-[#2f271f] shadow-sm transition hover:border-[#cfbea9] hover:text-[#394432]"
              >
                Pricing
              </Link>

              <Link
                href="/dashboard"
                onClick={closeAllMenus}
                className="rounded-[1.45rem] border border-[#ddcfbf] bg-[#fffaf3] px-4 py-4 text-sm font-semibold text-[#2f271f] shadow-sm transition hover:border-[#cfbea9] hover:text-[#394432]"
              >
                Dashboard
              </Link>
            </div>

            <section className="mt-5 rounded-[2rem] border border-[#ddcfbf] bg-[#f6f0e7] p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                  Search PDF tools
                </p>
                <h2 className="mt-1 text-3xl leading-none text-[#2f271f]">
                  Find the right workflow
                </h2>
              </div>

              <label className="mt-4 flex min-h-14 items-center gap-3 rounded-[1.35rem] border border-[#cfbea9] bg-[#fffaf3] px-4 shadow-sm focus-within:border-[#526047] focus-within:ring-4 focus-within:ring-[#e5eadf]">
                <Search size={19} className="shrink-0 text-[#9b8c7a]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search merge, sign, OCR..."
                  className="w-full bg-transparent text-sm font-medium text-[#2f271f] outline-none placeholder:text-[#9b8c7a]"
                />
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe5d8] text-[#78695b] transition hover:bg-[#e6d8c6] hover:text-[#2f271f]"
                    aria-label="Clear mobile tool search"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </label>

              {normalizedQuery ? (
                <div className="mt-4">
                  {matchedTools.length > 0 ? (
                    <div className="space-y-1 rounded-[1.75rem] border border-[#ddcfbf] bg-[#fffaf3] p-2">
                      {matchedTools.map((tool) => (
                        <ToolRow
                          key={tool.id}
                          tool={tool}
                          onNavigate={closeAllMenus}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptySearchState query={normalizedQuery} />
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                      Popular starts
                    </p>

                    <div className="mt-3 space-y-1 rounded-[1.75rem] border border-[#ddcfbf] bg-[#fffaf3] p-2">
                      {POPULAR_TOOLS.slice(0, 5).map((tool) => (
                        <ToolRow
                          key={tool.id}
                          tool={tool}
                          onNavigate={closeAllMenus}
                          compact
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {TOOL_MENU_GROUPS.map((group) => (
                      <div
                        key={group.category}
                        className="rounded-[1.75rem] border border-[#ddcfbf] bg-[#fffaf3] p-3"
                      >
                        <div className="px-2 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#986447]">
                            {group.label}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#78695b]">
                            {group.description}
                          </p>
                        </div>

                        <div className="mt-1 space-y-1">
                          {group.tools.map((tool) => (
                            <ToolRow
                              key={tool.id}
                              tool={tool}
                              onNavigate={closeAllMenus}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <Link
              href="/tools"
              onClick={closeAllMenus}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#394432] to-[#526047] px-5 py-3 text-sm font-semibold text-[#fffaf3] shadow-[0_18px_40px_rgba(57,68,50,0.24)] transition hover:-translate-y-0.5"
            >
              View all PDFMantra tools
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
