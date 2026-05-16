"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
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

const PRIMARY_NAV = [
  {
    label: "Tools",
    href: "/tools",
  },
  {
    label: "Editor",
    href: "/editor",
  },
  {
    label: "Highlight",
    href: "/tools/highlight-pdf",
  },
] as const;

function getToolStatusLabel(tool: Tool) {
  return STATUS_CONFIG[tool.status];
}

function ToolLine({
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
        "group flex w-full items-start justify-between gap-4 border-b border-violet-100 transition duration-200 last:border-b-0 hover:bg-violet-50/80",
        compact ? "px-3 py-3" : "px-4 py-4",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={[
            "mt-0.5 flex shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600 transition duration-200 group-hover:border-violet-200 group-hover:bg-violet-600 group-hover:text-white",
            compact ? "h-9 w-9" : "h-10 w-10",
          ].join(" ")}
        >
          <Icon size={compact ? 16 : 17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-[-0.02em] text-slate-950 transition group-hover:text-violet-700">
              {tool.title}
            </span>

            {tool.newTool ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-600">
                New
              </span>
            ) : null}

            <span className={status.className}>{status.label}</span>
          </div>

          <p
            className={[
              "mt-1.5 text-sm leading-6 text-slate-500",
              compact ? "line-clamp-2" : "max-w-xl",
            ].join(" ")}
          >
            {tool.menuDescription}
          </p>
        </div>
      </div>

      <ArrowRight
        size={16}
        className="mt-1 shrink-0 text-violet-200 transition duration-200 group-hover:translate-x-1 group-hover:text-violet-600"
      />
    </Link>
  );
}

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-violet-200 bg-violet-50/70 px-6 text-center">
      <Search size={22} className="text-violet-400" />
      <h3 className="mt-4 text-base font-semibold tracking-[-0.03em] text-slate-950">
        No strong tool match found
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        We could not find a close match for{" "}
        <span className="font-semibold text-slate-950">“{query}”</span>. Try merge,
        sign, compress, OCR, protect, or images to PDF.
      </p>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative inline-flex min-h-12 items-center px-1 text-sm font-semibold tracking-[-0.01em] transition duration-200",
        active ? "text-violet-700" : "text-slate-600 hover:text-violet-700",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "absolute bottom-2 left-0 h-px bg-violet-600 transition-all duration-200",
          active ? "w-full" : "w-0 group-hover:w-full",
        ].join(" ")}
      />
    </Link>
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
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-6">
          <Link href="/" className="group shrink-0">
            <div className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.055em] text-slate-950 transition duration-200 group-hover:text-violet-700">
              PDFMantra
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span className="h-px w-5 bg-violet-500" />
              Smart PDF Workspace
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-7 xl:flex">
            <div ref={desktopMenuRef} className="relative">
              <button
                type="button"
                onClick={toggleToolsMenu}
                aria-expanded={toolsMenuOpen}
                aria-haspopup="dialog"
                className={[
                  "group relative inline-flex min-h-12 items-center gap-2 px-1 text-sm font-semibold tracking-[-0.01em] transition duration-200",
                  toolsMenuOpen ? "text-violet-700" : "text-slate-600 hover:text-violet-700",
                ].join(" ")}
              >
                Browse Tools
                <ChevronDown
                  size={15}
                  className={[
                    "transition duration-200",
                    toolsMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "absolute bottom-2 left-0 h-px bg-violet-600 transition-all duration-200",
                    toolsMenuOpen ? "w-full" : "w-0 group-hover:w-full",
                  ].join(" ")}
                />
              </button>

              {toolsMenuOpen ? (
                <div className="absolute left-1/2 top-[calc(100%+0.9rem)] flex max-h-[calc(100vh-6.5rem)] w-[min(1180px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_46px_130px_rgba(86,61,190,0.22)]">
                  <div className="grid shrink-0 grid-cols-[1fr_auto] items-end gap-6 border-b border-violet-100 bg-violet-50/70 px-7 py-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
                        PDFMantra Directory
                      </p>
                      <h2 className="mt-2 text-4xl leading-[0.92] text-slate-950">
                        Find the PDF workflow in one glance.
                      </h2>
                    </div>

                    <Link
                      href="/tools"
                      onClick={closeAllMenus}
                      className="inline-flex min-h-12 items-center gap-2 border-b border-violet-600 px-1 text-sm font-semibold text-violet-700 transition hover:text-violet-900"
                    >
                      Full tools page
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <div className="shrink-0 border-b border-violet-100 bg-white px-7 py-5">
                    <label className="flex min-h-14 items-center gap-3 border-b border-violet-200 pb-3 focus-within:border-violet-600">
                      <Search size={19} className="shrink-0 text-violet-400" />
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search merge, sign, compress, OCR, protect, images to PDF..."
                        className="w-full bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                      />
                      {normalizedQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-950"
                          aria-label="Clear tool search"
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </label>
                  </div>

                  {normalizedQuery ? (
                    <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px] overflow-hidden bg-white">
                      <div className="min-h-0 overflow-y-auto border-r border-violet-100 px-6 py-5">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                            Search results
                          </p>
                          <span className="text-xs font-semibold text-slate-500">
                            {matchedTools.length} match
                            {matchedTools.length === 1 ? "" : "es"}
                          </span>
                        </div>

                        {matchedTools.length > 0 ? (
                          <div className="border-t border-violet-100">
                            {matchedTools.map((tool) => (
                              <ToolLine
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

                      <aside className="min-h-0 overflow-y-auto bg-violet-50/70 px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                          Search prompts
                        </p>
                        <h3 className="mt-2 text-2xl leading-none text-slate-950">
                          Try natural task words
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-slate-500">
                          Search PDFMantra the way a real user thinks: by goal,
                          not by hidden product labels.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3">
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
                              className="border-b border-violet-200 pb-1 text-sm font-semibold text-violet-700 transition hover:border-violet-600 hover:text-violet-900"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_320px] overflow-hidden bg-white">
                      <aside className="min-h-0 overflow-y-auto border-r border-violet-100 bg-violet-50/70 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Categories
                        </p>

                        <div className="mt-4 space-y-0 border-t border-violet-100">
                          {TOOL_MENU_GROUPS.map((group) => (
                            <button
                              key={group.category}
                              type="button"
                              onClick={() => setActiveCategory(group.category)}
                              className={[
                                "w-full border-b border-violet-100 px-0 py-4 text-left transition duration-200",
                                activeCategory === group.category
                                  ? "text-violet-700"
                                  : "text-slate-500 hover:text-slate-950",
                              ].join(" ")}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold">
                                  {CATEGORY_MENU_LABELS[group.category]}
                                </span>
                                {activeCategory === group.category ? (
                                  <span className="h-px w-8 bg-violet-600" />
                                ) : null}
                              </div>
                              <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                                {group.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </aside>

                      <section className="min-h-0 overflow-y-auto px-6 py-5">
                        <div className="mb-4 border-b border-violet-100 pb-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                            {activeGroup?.label}
                          </p>
                          <h3 className="mt-2 text-3xl leading-none text-slate-950">
                            {activeGroup?.description}
                          </h3>
                        </div>

                        <div className="border-t border-violet-100">
                          {activeGroup?.tools.map((tool) => (
                            <ToolLine
                              key={tool.id}
                              tool={tool}
                              onNavigate={closeAllMenus}
                            />
                          ))}
                        </div>
                      </section>

                      <aside className="min-h-0 overflow-y-auto border-l border-violet-100 bg-violet-50/70 px-6 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                            Popular workflows
                          </p>
                          <Sparkles size={15} className="text-fuchsia-500" />
                        </div>

                        <h3 className="mt-2 text-2xl leading-none text-slate-950">
                          Quick starts
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-slate-500">
                          Common PDF tasks surfaced as helpful shortcuts.
                        </p>

                        <div className="mt-5 border-t border-violet-100">
                          {POPULAR_TOOLS.map((tool) => (
                            <ToolLine
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

            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.label}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
              />
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-7 xl:flex">
            <NavLink href="/pricing" label="Pricing" active={pathname === "/pricing"} />
            <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />

            <Link
              href="/editor"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(91,63,193,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700"
            >
              <Sparkles size={15} />
              Start Editing
              <ArrowRight size={15} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((current) => !current);
              setToolsMenuOpen(false);
              setSearchQuery("");
            }}
            className="inline-flex h-11 w-11 items-center justify-center text-slate-950 transition hover:text-violet-700 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[77px] z-40 h-[calc(100vh-77px)] overflow-y-auto border-t border-violet-100 bg-white px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-0 border-y border-violet-100">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="flex items-center justify-between border-b border-violet-100 py-4 text-lg font-semibold tracking-[-0.03em] text-slate-950 last:border-b-0"
                >
                  {item.label}
                  <ArrowRight size={16} className="text-violet-300" />
                </Link>
              ))}

              <Link
                href="/pricing"
                onClick={closeAllMenus}
                className="flex items-center justify-between border-b border-violet-100 py-4 text-lg font-semibold tracking-[-0.03em] text-slate-950"
              >
                Pricing
                <ArrowRight size={16} className="text-violet-300" />
              </Link>

              <Link
                href="/dashboard"
                onClick={closeAllMenus}
                className="flex items-center justify-between py-4 text-lg font-semibold tracking-[-0.03em] text-slate-950"
              >
                Dashboard
                <ArrowRight size={16} className="text-violet-300" />
              </Link>
            </div>

            <section className="mt-7 border-t border-violet-100 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                  Tool search
                </p>
                <h2 className="mt-2 text-4xl leading-[0.96] text-slate-950">
                  Find a PDF workflow directly.
                </h2>
              </div>

              <label className="mt-5 flex min-h-14 items-center gap-3 border-b border-violet-200 pb-3 focus-within:border-violet-600">
                <Search size={19} className="shrink-0 text-violet-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search merge, sign, OCR..."
                  className="w-full bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-950"
                    aria-label="Clear mobile tool search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </label>

              {normalizedQuery ? (
                <div className="mt-5">
                  {matchedTools.length > 0 ? (
                    <div className="border-t border-violet-100">
                      {matchedTools.map((tool) => (
                        <ToolLine
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
                  <div className="mt-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                      Popular workflows
                    </p>

                    <div className="mt-4 border-t border-violet-100">
                      {POPULAR_TOOLS.slice(0, 5).map((tool) => (
                        <ToolLine
                          key={tool.id}
                          tool={tool}
                          onNavigate={closeAllMenus}
                          compact
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 space-y-6 border-t border-violet-100 pt-6">
                    {TOOL_MENU_GROUPS.map((group) => (
                      <div key={group.category}>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                            {group.label}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">
                            {group.description}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-violet-100">
                          {group.tools.map((tool) => (
                            <ToolLine
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
              href="/editor"
              onClick={closeAllMenus}
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(91,63,193,0.24)]"
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
