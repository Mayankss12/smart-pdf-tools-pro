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
    label: "Edit",
    href: "/editor",
  },
  {
    label: "Highlight",
    href: "/tools/highlight-pdf",
  },
  {
    label: "Organize",
    href: "/tools",
  },
  {
    label: "Convert",
    href: "/tools",
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
        "group flex w-full items-start justify-between gap-4 border-b border-[#eadfce] transition duration-200 last:border-b-0 hover:bg-[#fbf7f0]",
        compact ? "px-3 py-3" : "px-4 py-4",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={[
            "mt-0.5 flex shrink-0 items-center justify-center border border-[#d9cbb9] bg-[#f0f3eb] text-[#526047] transition duration-200 group-hover:border-[#cfbea9] group-hover:bg-[#526047] group-hover:text-[#fffaf3]",
            compact ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-xl",
          ].join(" ")}
        >
          <Icon size={compact ? 16 : 17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-[-0.02em] text-[#2f271f] transition group-hover:text-[#394432]">
              {tool.title}
            </span>

            {tool.newTool ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#986447]">
                New
              </span>
            ) : null}

            <span className={status.className}>{status.label}</span>
          </div>

          <p
            className={[
              "mt-1.5 text-sm leading-6 text-[#78695b]",
              compact ? "line-clamp-2" : "max-w-xl",
            ].join(" ")}
          >
            {tool.menuDescription}
          </p>
        </div>
      </div>

      <ArrowRight
        size={16}
        className="mt-1 shrink-0 text-[#c7b8a6] transition duration-200 group-hover:translate-x-1 group-hover:text-[#526047]"
      />
    </Link>
  );
}

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#cfbea9] bg-[#fbf7f0] px-6 text-center">
      <Search size={22} className="text-[#78695b]" />
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

function EditorialNavLink({
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
        active ? "text-[#394432]" : "text-[#5e5144] hover:text-[#394432]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "absolute bottom-2 left-0 h-px bg-[#526047] transition-all duration-200",
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
    <header className="sticky top-0 z-50 border-b border-[#d7c9b8]/85 bg-[#fbf7f0]/92 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-6">
          <Link href="/" className="group shrink-0">
            <div className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.055em] text-[#2f271f] transition duration-200 group-hover:text-[#394432]">
              PDFMantra
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8c7b68]">
              <span className="h-px w-5 bg-[#b77b59]" />
              Premium PDF Workspace
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
                  toolsMenuOpen ? "text-[#394432]" : "text-[#5e5144] hover:text-[#394432]",
                ].join(" ")}
              >
                Tools
                <ChevronDown
                  size={15}
                  className={[
                    "transition duration-200",
                    toolsMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "absolute bottom-2 left-0 h-px bg-[#526047] transition-all duration-200",
                    toolsMenuOpen ? "w-full" : "w-0 group-hover:w-full",
                  ].join(" ")}
                />
              </button>

              {toolsMenuOpen ? (
                <div className="absolute left-1/2 top-[calc(100%+0.9rem)] flex max-h-[calc(100vh-6.5rem)] w-[min(1180px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden border border-[#ddcfbf] bg-[#fffaf3] shadow-[0_46px_130px_rgba(54,45,36,0.26)]">
                  <div className="grid shrink-0 grid-cols-[1fr_auto] items-end gap-6 border-b border-[#ddcfbf] bg-[#f6f0e7] px-7 py-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#986447]">
                        PDFMantra Directory
                      </p>
                      <h2 className="mt-2 text-4xl leading-[0.92] text-[#2f271f]">
                        Choose a workflow, not a cluttered tool grid.
                      </h2>
                    </div>

                    <Link
                      href="/tools"
                      onClick={closeAllMenus}
                      className="inline-flex min-h-12 items-center gap-2 border-b border-[#526047] px-1 text-sm font-semibold text-[#394432] transition hover:text-[#2f271f]"
                    >
                      Full tools page
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <div className="shrink-0 border-b border-[#ddcfbf] bg-[#fffaf3] px-7 py-5">
                    <label className="flex min-h-14 items-center gap-3 border-b border-[#cfbea9] pb-3 focus-within:border-[#526047]">
                      <Search size={19} className="shrink-0 text-[#9b8c7a]" />
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search merge, sign, compress, OCR, protect, images to PDF..."
                        className="w-full bg-transparent text-sm font-medium text-[#2f271f] outline-none placeholder:text-[#9b8c7a]"
                      />
                      {normalizedQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-[#78695b] transition hover:text-[#2f271f]"
                          aria-label="Clear tool search"
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </label>
                  </div>

                  {normalizedQuery ? (
                    <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px] overflow-hidden bg-[#fffaf3]">
                      <div className="min-h-0 overflow-y-auto border-r border-[#ddcfbf] px-6 py-5">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#986447]">
                            Search results
                          </p>
                          <span className="text-xs font-semibold text-[#78695b]">
                            {matchedTools.length} match
                            {matchedTools.length === 1 ? "" : "es"}
                          </span>
                        </div>

                        {matchedTools.length > 0 ? (
                          <div className="border-t border-[#eadfce]">
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

                      <aside className="min-h-0 overflow-y-auto bg-[#f6f0e7] px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                          Search prompts
                        </p>
                        <h3 className="mt-2 text-2xl leading-none text-[#2f271f]">
                          Try intent-based words
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-[#78695b]">
                          PDFMantra search is designed around how users describe
                          a task, not around hidden product labels.
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
                              className="border-b border-[#cfbea9] pb-1 text-sm font-semibold text-[#526047] transition hover:border-[#526047] hover:text-[#394432]"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_320px] overflow-hidden bg-[#fffaf3]">
                      <aside className="min-h-0 overflow-y-auto border-r border-[#ddcfbf] bg-[#f6f0e7] px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7b68]">
                          Categories
                        </p>

                        <div className="mt-4 space-y-0 border-t border-[#eadfce]">
                          {TOOL_MENU_GROUPS.map((group) => (
                            <button
                              key={group.category}
                              type="button"
                              onClick={() => setActiveCategory(group.category)}
                              className={[
                                "w-full border-b border-[#eadfce] px-0 py-4 text-left transition duration-200",
                                activeCategory === group.category
                                  ? "text-[#394432]"
                                  : "text-[#78695b] hover:text-[#2f271f]",
                              ].join(" ")}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold">
                                  {CATEGORY_MENU_LABELS[group.category]}
                                </span>
                                {activeCategory === group.category ? (
                                  <span className="h-px w-8 bg-[#526047]" />
                                ) : null}
                              </div>
                              <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#8b7b68]">
                                {group.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </aside>

                      <section className="min-h-0 overflow-y-auto px-6 py-5">
                        <div className="mb-4 border-b border-[#eadfce] pb-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                            {activeGroup?.label}
                          </p>
                          <h3 className="mt-2 text-3xl leading-none text-[#2f271f]">
                            {activeGroup?.description}
                          </h3>
                        </div>

                        <div className="border-t border-[#eadfce]">
                          {activeGroup?.tools.map((tool) => (
                            <ToolLine
                              key={tool.id}
                              tool={tool}
                              onNavigate={closeAllMenus}
                            />
                          ))}
                        </div>
                      </section>

                      <aside className="min-h-0 overflow-y-auto border-l border-[#ddcfbf] bg-[#f6f0e7] px-6 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                            Popular workflows
                          </p>
                          <Sparkles size={15} className="text-[#b77b59]" />
                        </div>

                        <h3 className="mt-2 text-2xl leading-none text-[#2f271f]">
                          Quick starts
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-[#78695b]">
                          High-demand PDFMantra tasks surfaced as editorial
                          recommendations, not boxed cards.
                        </p>

                        <div className="mt-5 border-t border-[#eadfce]">
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
              <EditorialNavLink
                key={item.label}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
              />
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-7 xl:flex">
            <EditorialNavLink href="/pricing" label="Pricing" active={pathname === "/pricing"} />
            <EditorialNavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />

            <Link
              href="/editor"
              className="inline-flex min-h-12 items-center gap-2 border-l border-[#d7c9b8] pl-6 text-sm font-semibold text-[#394432] transition duration-200 hover:text-[#2f271f]"
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
            className="inline-flex h-11 w-11 items-center justify-center text-[#2f271f] transition hover:text-[#394432] xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[77px] z-40 h-[calc(100vh-77px)] overflow-y-auto border-t border-[#d7c9b8] bg-[#fffaf3] px-4 py-5 xl:hidden">
          <div className="mx-auto max-w-3xl">
            <div className="grid gap-0 border-y border-[#eadfce]">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeAllMenus}
                  className="flex items-center justify-between border-b border-[#eadfce] py-4 text-lg font-semibold tracking-[-0.03em] text-[#2f271f] last:border-b-0"
                >
                  {item.label}
                  <ArrowRight size={16} className="text-[#c7b8a6]" />
                </Link>
              ))}

              <Link
                href="/pricing"
                onClick={closeAllMenus}
                className="flex items-center justify-between border-b border-[#eadfce] py-4 text-lg font-semibold tracking-[-0.03em] text-[#2f271f]"
              >
                Pricing
                <ArrowRight size={16} className="text-[#c7b8a6]" />
              </Link>

              <Link
                href="/dashboard"
                onClick={closeAllMenus}
                className="flex items-center justify-between py-4 text-lg font-semibold tracking-[-0.03em] text-[#2f271f]"
              >
                Dashboard
                <ArrowRight size={16} className="text-[#c7b8a6]" />
              </Link>
            </div>

            <section className="mt-7 border-t border-[#eadfce] pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#986447]">
                  Tool search
                </p>
                <h2 className="mt-2 text-4xl leading-[0.96] text-[#2f271f]">
                  Find a PDF workflow directly.
                </h2>
              </div>

              <label className="mt-5 flex min-h-14 items-center gap-3 border-b border-[#cfbea9] pb-3 focus-within:border-[#526047]">
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
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-[#78695b] transition hover:text-[#2f271f]"
                    aria-label="Clear mobile tool search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </label>

              {normalizedQuery ? (
                <div className="mt-5">
                  {matchedTools.length > 0 ? (
                    <div className="border-t border-[#eadfce]">
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                      Popular workflows
                    </p>

                    <div className="mt-4 border-t border-[#eadfce]">
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

                  <div className="mt-7 space-y-6 border-t border-[#eadfce] pt-6">
                    {TOOL_MENU_GROUPS.map((group) => (
                      <div key={group.category}>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                            {group.label}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[#78695b]">
                            {group.description}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-[#eadfce]">
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
              className="mt-8 inline-flex min-h-12 items-center gap-2 border-b border-[#526047] pb-1 text-sm font-semibold text-[#394432]"
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
