"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import {
  STATUS_CONFIG,
  TOOL_CATEGORIES,
  getPopularTools,
  getToolsNeedingBackend,
  getWorkingTools,
  searchTools,
  tools,
  type Tool,
  type ToolCategory,
  type ToolProcessingMode,
  type ToolStatus,
} from "@/lib/tools";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type CategoryFilter = "all" | ToolCategory;
type StatusFilter = "all" | ToolStatus;
type ProcessingFilter = "all" | ToolProcessingMode;

const POPULAR_TOOLS = getPopularTools(8);
const WORKING_TOOLS = getWorkingTools();
const BACKEND_TOOLS = getToolsNeedingBackend();

const QUICK_SEARCHES = [
  "edit PDF",
  "merge files",
  "split pages",
  "highlight PDF",
  "protect PDF",
  "OCR PDF",
];

const STATUS_FILTERS: Array<{ readonly id: StatusFilter; readonly label: string }> = [
  { id: "all", label: "All" },
  { id: "beta", label: "Beta" },
  { id: "working", label: "Live" },
  { id: "coming-soon", label: "Soon" },
];

const PROCESSING_FILTERS: Array<{ readonly id: ProcessingFilter; readonly label: string }> = [
  { id: "all", label: "Any Engine" },
  { id: "browser", label: "Browser" },
  { id: "backend", label: "Backend" },
  { id: "hybrid", label: "Hybrid" },
];

function toneForCategory(category: ToolCategory): ToolGlyphTone {
  if (category === "convert-from" || category === "convert-to" || category === "scan") {
    return "mint";
  }

  if (category === "organize" || category === "optimize") {
    return "indigo";
  }

  return "violet";
}

function statusLabel(tool: Tool): string {
  return STATUS_CONFIG[tool.status].label;
}

function processingLabel(mode: ToolProcessingMode): string {
  if (mode === "browser") {
    return "Browser";
  }

  if (mode === "backend") {
    return "Backend";
  }

  return "Hybrid";
}

function statusClassName(status: ToolStatus): string {
  if (status === "working") {
    return "status-live";
  }

  if (status === "beta") {
    return "status-beta";
  }

  return "status-soon";
}

function processingClassName(mode: ToolProcessingMode): string {
  if (mode === "browser") {
    return "text-[var(--violet-600)]";
  }

  if (mode === "backend") {
    return "text-[var(--text-secondary)]";
  }

  return "text-[var(--success-text)]";
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] font-medium transition duration-200",
        active
          ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white"
          : "border-[var(--cream-border)] bg-[var(--cream-base)] text-[var(--text-secondary)] hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ToolGridCell({ tool, showCategory = false }: { readonly tool: Tool; readonly showCategory?: boolean }) {
  const Icon = tool.icon;
  const tone = toneForCategory(tool.category);

  return (
    <Link
      href={tool.href}
      className="group flex min-h-[106px] items-center justify-between gap-4 border-b border-r border-[var(--cream-border)] bg-[var(--cream-base)] px-4 py-4 transition duration-200 hover:bg-[var(--cream-secondary)] sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ToolGlyph icon={Icon} tone={tone} size="md" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
              {tool.title}
            </span>
            <span className={statusClassName(tool.status)}>{statusLabel(tool)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">
            {showCategory ? <span>{tool.category.replaceAll("-", " ")}</span> : null}
            {showCategory ? <span className="h-1 w-1 rounded-full bg-[var(--violet-border)]" /> : null}
            <span className={processingClassName(tool.capabilities.processingMode)}>
              {processingLabel(tool.capabilities.processingMode)}
            </span>
          </div>
        </div>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-[var(--text-caption)] transition duration-200 group-hover:translate-x-1 group-hover:text-[var(--violet-600)]"
      />
    </Link>
  );
}

function EmptyResults({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-dashed border-[var(--violet-border)] bg-[var(--cream-base)] px-6 py-14 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
        <Search size={22} />
      </div>
      <h3 className="display-font mt-5 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        No matching tools found
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm font-normal leading-7 text-[var(--text-secondary)]">
        Try another phrase or reset the filters to return to the full PDFMantra directory.
      </p>
      <button type="button" onClick={onReset} className="btn-primary mt-6">
        Reset view
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [processingFilter, setProcessingFilter] = useState<ProcessingFilter>("all");

  const normalizedQuery = query.trim();

  const searchRankedTools = useMemo(() => {
    if (!normalizedQuery) {
      return tools;
    }

    return searchTools(normalizedQuery, {
      includeComingSoon: true,
    }).map((result) => result.tool);
  }, [normalizedQuery]);

  const filteredTools = useMemo(() => {
    return searchRankedTools.filter((tool) => {
      const categoryMatches = categoryFilter === "all" || tool.category === categoryFilter;
      const statusMatches = statusFilter === "all" || tool.status === statusFilter;
      const processingMatches =
        processingFilter === "all" || tool.capabilities.processingMode === processingFilter;

      return categoryMatches && statusMatches && processingMatches;
    });
  }, [categoryFilter, processingFilter, searchRankedTools, statusFilter]);

  const groupedTools = useMemo(() => {
    return TOOL_CATEGORIES.map((category) => ({
      category,
      tools: filteredTools.filter((tool) => tool.category === category.id),
    })).filter((group) => group.tools.length > 0);
  }, [filteredTools]);

  const activeFilterCount = [
    categoryFilter !== "all",
    statusFilter !== "all",
    processingFilter !== "all",
    normalizedQuery.length > 0,
  ].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setProcessingFilter("all");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--cream-base)] text-[var(--text-primary)]">
        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div className="max-w-xl">
                <div className="eyebrow-chip">
                  <Sparkles size={13} />
                  PDFMantra Tools
                </div>

                <h1 className="display-font mt-5 text-[2.35rem] font-semibold leading-[1.16] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.9rem] lg:text-[3.35rem]">
                  All PDF tools,
                  <span className="block text-[var(--violet-600)]">ready to open.</span>
                </h1>

                <p className="mt-4 max-w-lg text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                  Pick a workflow below or search by task. PDF upload begins inside the tool you choose.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5 text-[12px] font-medium text-[var(--text-secondary)]">
                  <span className="soft-pill">{tools.length} tools</span>
                  <span className="soft-pill">{WORKING_TOOLS.length} live</span>
                  <span className="soft-pill">{BACKEND_TOOLS.length} backend-ready</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]">
                <label className="flex min-h-[72px] items-center gap-4 border-b border-[var(--cream-border)] px-5 sm:px-6">
                  <Search size={20} className="shrink-0 text-[var(--violet-600)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search merge, split, OCR, redact, sign, protect..."
                    className="w-full bg-transparent text-[15px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                  {normalizedQuery ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--cream-border)] bg-[var(--cream-base)] text-[var(--text-muted)] transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                      aria-label="Clear tools search"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </label>

                <div className="flex flex-wrap gap-2 border-b border-[var(--cream-border)] px-5 py-4 sm:px-6">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-2 text-[12px] font-medium text-[var(--violet-600)] transition hover:bg-[var(--violet-100)]"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 divide-x divide-[var(--cream-border)] text-center">
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{tools.length}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">Tools</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{WORKING_TOOLS.length}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">Live</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{BACKEND_TOOLS.length}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">Backend</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-secondary)]">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Quick view</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Popular PDF workflows
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
                Start with the flows people use most, then move into the full categorized directory.
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--cream-border)] md:grid-cols-2 xl:grid-cols-4">
                {POPULAR_TOOLS.map((tool) => (
                  <ToolGridCell key={`popular-${tool.id}`} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">Refine the directory</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Filter without clutter
                </h2>
              </div>

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--cream-border)] bg-[var(--cream-base)] px-4 text-[13px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                >
                  Reset {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
                  <X size={15} />
                </button>
              ) : null}
            </div>

            <div className="mt-7 space-y-5 rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] px-5 py-5 shadow-[var(--shadow-soft)] sm:px-6">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">
                  <Filter size={14} className="text-[var(--violet-600)]" />
                  Category
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <FilterChip active={categoryFilter === "all"} label="All Categories" onClick={() => setCategoryFilter("all")} />
                  {TOOL_CATEGORIES.map((category) => (
                    <FilterChip
                      key={category.id}
                      active={categoryFilter === category.id}
                      label={category.menuLabel}
                      onClick={() => setCategoryFilter(category.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">
                    Status
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {STATUS_FILTERS.map((status) => (
                      <FilterChip key={status.id} active={statusFilter === status.id} label={status.label} onClick={() => setStatusFilter(status.id)} />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">
                    Processing
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {PROCESSING_FILTERS.map((processing) => (
                      <FilterChip
                        key={processing.id}
                        active={processingFilter === processing.id}
                        label={processing.label}
                        onClick={() => setProcessingFilter(processing.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--cream-secondary)]">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">{normalizedQuery ? "Search results" : "Tool directory"}</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  {filteredTools.length} tool{filteredTools.length === 1 ? "" : "s"} matched
                </h2>
              </div>

              <div className="soft-pill">
                <CheckCircle2 size={14} />
                {activeFilterCount === 0 ? "Showing full directory" : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`}
              </div>
            </div>

            {filteredTools.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : normalizedQuery ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]">
                <div className="grid border-l border-t border-[var(--cream-border)] md:grid-cols-2 xl:grid-cols-3">
                  {filteredTools.map((tool) => (
                    <ToolGridCell key={`search-${tool.id}`} tool={tool} showCategory />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {groupedTools.map((group) => (
                  <section
                    key={group.category.id}
                    className="overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-col justify-between gap-4 border-b border-[var(--cream-border)] bg-[var(--cream-base)] px-5 py-5 sm:flex-row sm:items-end sm:px-6">
                      <div>
                        <p className="section-eyebrow !text-[11px]">{group.category.menuLabel}</p>
                        <h3 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                          {group.category.label}
                        </h3>
                      </div>
                      <span className="status-soon">{group.tools.length} tools</span>
                    </div>

                    <div className="grid border-l border-t border-[var(--cream-border)] md:grid-cols-2 xl:grid-cols-3">
                      {group.tools.map((tool) => (
                        <ToolGridCell key={tool.id} tool={tool} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
