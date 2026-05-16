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
  BadgeCheck,
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
  if (category === "security" || category === "ai") {
    return "blush";
  }

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
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "beta") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-rose-50 text-rose-600";
}

function processingClassName(mode: ToolProcessingMode): string {
  if (mode === "browser") {
    return "text-violet-600";
  }

  if (mode === "backend") {
    return "text-rose-500";
  }

  return "text-emerald-600";
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
        "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-200",
        active
          ? "border-violet-600 bg-violet-600 text-white shadow-[0_14px_30px_rgba(91,63,193,0.2)]"
          : "border-violet-100 bg-white/90 text-slate-600 hover:border-violet-200 hover:text-violet-700",
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
      className="group flex min-h-[108px] items-center justify-between gap-4 border-b border-r border-violet-100 bg-white/68 px-4 py-4 transition duration-200 hover:bg-white sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ToolGlyph icon={Icon} tone={tone} size="md" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition group-hover:text-violet-700">
              {tool.title}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusClassName(tool.status)}`}>
              {statusLabel(tool)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {showCategory ? <span>{tool.category.replaceAll("-", " ")}</span> : null}
            {showCategory ? <span className="h-1 w-1 rounded-full bg-violet-200" /> : null}
            <span className={processingClassName(tool.capabilities.processingMode)}>
              {processingLabel(tool.capabilities.processingMode)}
            </span>
          </div>
        </div>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-violet-200 transition duration-200 group-hover:translate-x-1 group-hover:text-violet-700"
      />
    </Link>
  );
}

function EmptyResults({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-dashed border-violet-200 bg-white/74 px-6 py-14 text-center shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-violet-100 bg-violet-50 text-violet-600">
        <Search size={22} />
      </div>
      <h3 className="display-font mt-5 text-[1.8rem] font-medium tracking-[-0.04em] text-slate-950">
        No matching tools found
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
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

      <main className="min-h-screen bg-[#faf8ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-14rem] top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-200/72 blur-3xl" />
            <div className="absolute right-[-15rem] top-[-8rem] h-[38rem] w-[38rem] rounded-full bg-rose-200/68 blur-3xl" />
            <div className="absolute bottom-[-20rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-fuchsia-100/80 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-11 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="mx-auto max-w-5xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={13} />
                PDFMantra Tool Directory
              </div>

              <h1 className="display-font mx-auto mt-6 max-w-5xl text-[2.8rem] font-medium leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-[3.7rem] lg:text-[4.6rem]">
                Choose the PDF task,
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                  start in one click.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-3xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                Search by intent, scan categories quickly, and move directly into the workflow you need.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[2rem] border border-violet-100 bg-white/84 shadow-[0_24px_70px_rgba(91,63,193,0.11)] backdrop-blur">
              <label className="flex min-h-[72px] items-center gap-4 border-b border-violet-100 px-5 sm:px-6">
                <Search size={20} className="shrink-0 text-violet-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search merge, split, OCR, redact, sign, protect..."
                  className="w-full bg-transparent text-[15px] font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                />
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-slate-500 transition hover:text-violet-700"
                    aria-label="Clear tools search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </label>

              <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-wrap gap-2 border-b border-violet-100 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-violet-100 bg-violet-50/75 px-3 py-2 text-[12px] font-semibold text-violet-700 transition hover:border-violet-200 hover:bg-violet-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 items-center divide-x divide-violet-100 text-center">
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-slate-950">{tools.length}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Tools</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-slate-950">{WORKING_TOOLS.length}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Live</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-slate-950">{BACKEND_TOOLS.length}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Backend</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/78">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                  Quick view
                </p>
                <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                  Popular PDF workflows
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-[15px] lg:justify-self-end">
                A cleaner tools page starts with the flows people look for first, then expands into the full categorized directory.
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-[2rem] border border-violet-100 bg-white/72 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
              <div className="grid border-l border-t border-violet-100 md:grid-cols-2 xl:grid-cols-4">
                {POPULAR_TOOLS.map((tool) => (
                  <ToolGridCell key={`popular-${tool.id}`} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-[#faf8ff]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                  Refine the directory
                </p>
                <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                  Filter without clutter
                </h2>
              </div>

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-violet-100 bg-white/92 px-4 text-[13px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
                >
                  Reset {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
                  <X size={15} />
                </button>
              ) : null}
            </div>

            <div className="mt-7 space-y-5 rounded-[2rem] border border-violet-100 bg-white/72 px-5 py-5 shadow-[0_18px_50px_rgba(91,63,193,0.08)] sm:px-6">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Filter size={14} className="text-violet-600" />
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
                  <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {STATUS_FILTERS.map((status) => (
                      <FilterChip key={status.id} active={statusFilter === status.id} label={status.label} onClick={() => setStatusFilter(status.id)} />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">
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

        <section className="bg-white/82">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                  {normalizedQuery ? "Search results" : "Tool directory"}
                </p>
                <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                  {filteredTools.length} tool{filteredTools.length === 1 ? "" : "s"} matched
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/75 px-4 py-2 text-[12px] font-semibold text-violet-700">
                <CheckCircle2 size={14} />
                {activeFilterCount === 0 ? "Showing full directory" : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`}
              </div>
            </div>

            {filteredTools.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : normalizedQuery ? (
              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/72 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
                <div className="grid border-l border-t border-violet-100 md:grid-cols-2 xl:grid-cols-3">
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
                    className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/72 shadow-[0_18px_46px_rgba(91,63,193,0.08)]"
                  >
                    <div className="flex flex-col justify-between gap-4 border-b border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-rose-50/70 px-5 py-5 sm:flex-row sm:items-end sm:px-6">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                          {group.category.menuLabel}
                        </p>
                        <h3 className="display-font mt-2 text-[1.75rem] font-medium tracking-[-0.035em] text-slate-950">
                          {group.category.label}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-500 shadow-sm">
                        {group.tools.length} tools
                      </span>
                    </div>

                    <div className="grid border-l border-t border-violet-100 md:grid-cols-2 xl:grid-cols-3">
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
