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
        "group flex w-full items-start gap-3 rounded-2xl border border-transparent transition duration-200",
        compact
          ? "px-3 py-3 hover:border-indigo-100 hover:bg-indigo-50"
          : "px-4 py-4 hover:border-indigo-100 hover:bg-indigo-50",
      ].join(" ")}
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition duration-200 group-hover:border-indigo-200 group-hover:bg-white",
          compact ? "h-10 w-10" : "h-11 w-11",
        ].join(" ")}
      >
        <Icon size={compact ? 18 : 19} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tracking-[-0.02em] text-slate-950 transition group-hover:text-indigo-700">
            {tool.title}
          </span>

          {tool.newTool ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              New
            </span>
          ) : null}

          <span className={status.className}>{status.label}</span>
        </div>

        <p
          className={[
            "mt-1.5 max-w-xl text-sm leading-6 text-slate-600",
            compact ? "line-clamp-2" : "",
          ].join(" ")}
        >
          {tool.menuDescription}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="mt-1 shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-600"
      />
    </Link>
  );
}

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
        <Search size={20} />
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-[-0.03em] text-slate-950">
        No strong tool match found
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
        We could not find a close match for{" "}
        <span className="font-semibold text-slate-900">“{query}”</span>. Try
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-950 text-white shadow-lg shadow-indigo-200/70 transition duration-200 group-hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
            <FileText size={21} className="relative" />
          </div>

          <div className="leading-tight">
            <div className="text-base font-semibold tracking-[-0.03em] text-slate-950">
              PDFMantra
            </div>
            <div className="text-xs font-medium text-slate-500">
              Premium PDF Workspace
            </div>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          <div ref={desktopMenuRef} className="relative">
            <button
              type="button"
              onClick={toggleToolsMenu}
              aria-expanded={toolsMenuOpen}
              aria-haspopup="dialog"
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition duration-200",
                toolsMenuOpen
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
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
              <div className="absolute left-1/2 top-[calc(100%+0.9rem)] flex max-h-[calc(100vh-6.25rem)] w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.28)]">
                {/* Fixed top search region */}
                <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        Tool Discovery
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        Find the right PDFMantra tool instantly
                      </h2>
                    </div>

                    <Link
                      href="/tools"
                      onClick={closeAllMenus}
                      className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-md"
                    >
                      View all tools
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <label className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
                    <Search size={19} className="shrink-0 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search merge, sign, compress, OCR, password, images to PDF..."
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    {normalizedQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                        aria-label="Clear tool search"
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </label>
                </div>

                {/* Scrollable menu body */}
                {normalizedQuery ? (
                  <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] overflow-hidden bg-white">
                    {/* Search results */}
                    <div className="min-h-0 overflow-y-auto border-r border-slate-200 px-5 py-5">
                      <div className="mb-3 flex items-center justify-between px-2">
                        <p className="text-sm font-semibold text-slate-950">
                          Search results
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
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

                    {/* Search guidance */}
                    <aside className="min-h-0 overflow-y-auto bg-slate-50 px-5 py-5">
                      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                          Search Intelligence
                        </p>

                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                          Try natural intent words
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
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
                              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : (
                  <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px] overflow-hidden bg-white">
                    {/* Category rail */}
                    <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-4 py-5">
                      <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Categories
                      </p>

                      <div className="mt-3 space-y-1">
                        {TOOL_MENU_GROUPS.map((group) => (
                          <button
                            key={group.category}
                            type="button"
                            onClick={() => setActiveCategory(group.category)}
                            className={[
                              "w-full rounded-2xl px-3 py-3 text-left transition duration-200",
                              activeCategory === group.category
                                ? "border border-indigo-100 bg-white text-indigo-700 shadow-sm"
                                : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950",
                            ].join(" ")}
                          >
                            <div className="text-sm font-semibold">
                              {CATEGORY_MENU_LABELS[group.category]}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {group.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </aside>

                    {/* Active category tools */}
                    <section className="min-h-0 overflow-y-auto px-5 py-5">
                      <div className="mb-3 px-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                          {activeGroup?.label}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">
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

                    {/* Popular tools */}
                    <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-slate-50 px-5 py-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                          Popular
                        </p>

                        <Sparkles size={16} className="text-indigo-500" />
                      </div>

                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                        Quick starts
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        High-demand PDFMantra workflows surfaced first for
                        faster discovery.
                      </p>

                      <div className="mt-4 space-y-1 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-sm">
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
                  "inline-flex min-h-11 items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition duration-200",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right secondary nav */}
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <Link
            href="/pricing"
            className={[
              "inline-flex min-h-11 items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition duration-200",
              pathname === "/pricing"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700",
            ].join(" ")}
          >
            Pricing
          </Link>

          <Link
            href="/dashboard"
            className={[
              "inline-flex min-h-11 items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition duration-200",
              pathname === "/dashboard"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-indigo-700",
            ].join(" ")}
          >
            Dashboard
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/editor"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-300/80 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 sm:inline-flex"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet menu */}
      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[69px] z-40 h-[calc(100vh-69px)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIMARY_SHORTCUTS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  {item.label}
                </Link>
              ))}

              <Link
                href="/pricing"
                onClick={closeAllMenus}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Pricing
              </Link>

              <Link
                href="/dashboard"
                onClick={closeAllMenus}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Dashboard
              </Link>
            </div>

            <section className="mt-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Search PDF tools
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Find the right workflow
                </h2>
              </div>

              <label className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
                <Search size={19} className="shrink-0 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search merge, sign, OCR..."
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                    aria-label="Clear mobile tool search"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </label>

              {normalizedQuery ? (
                <div className="mt-4">
                  {matchedTools.length > 0 ? (
                    <div className="space-y-1 rounded-[1.75rem] border border-slate-200 bg-white p-2">
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                      Popular starts
                    </p>

                    <div className="mt-3 space-y-1 rounded-[1.75rem] border border-slate-200 bg-white p-2">
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
                        className="rounded-[1.75rem] border border-slate-200 bg-white p-3"
                      >
                        <div className="px-2 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                            {group.label}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
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
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300/80 transition hover:-translate-y-0.5 hover:bg-indigo-700"
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
