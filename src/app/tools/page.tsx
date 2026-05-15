"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import {
  STATUS_CONFIG,
  TOOL_CATEGORIES,
  getFeaturedTools,
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
  Brain,
  CheckCircle2,
  Cpu,
  FileText,
  Filter,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

type CategoryFilter = "all" | ToolCategory;
type StatusFilter = "all" | ToolStatus;
type ProcessingFilter = "all" | ToolProcessingMode;

const FEATURED_TOOLS = getFeaturedTools(6);
const POPULAR_TOOLS = getPopularTools(8);
const WORKING_TOOLS = getWorkingTools();
const BACKEND_TOOLS = getToolsNeedingBackend();

const QUICK_SEARCHES = [
  "edit PDF",
  "combine files",
  "reduce PDF size",
  "scan text",
  "add signature",
  "password protect",
];

const STATUS_FILTERS: Array<{
  id: StatusFilter;
  label: string;
}> = [
  { id: "all", label: "All Status" },
  { id: "beta", label: "Beta" },
  { id: "working", label: "Live" },
  { id: "coming-soon", label: "Coming Soon" },
];

const PROCESSING_FILTERS: Array<{
  id: ProcessingFilter;
  label: string;
  description: string;
}> = [
  {
    id: "all",
    label: "All Processing",
    description: "Every PDFMantra workflow",
  },
  {
    id: "browser",
    label: "Browser-first",
    description: "Interactive frontend-side tools",
  },
  {
    id: "backend",
    label: "Backend-grade",
    description: "Heavy PDF processing roadmap",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Frontend + backend together",
  },
];

function getStatusBadge(tool: Tool) {
  return STATUS_CONFIG[tool.status];
}

function processingLabel(mode: ToolProcessingMode) {
  if (mode === "browser") {
    return "Browser-first";
  }

  if (mode === "backend") {
    return "Backend-grade";
  }

  return "Hybrid";
}

function processingClassName(mode: ToolProcessingMode) {
  if (mode === "browser") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (mode === "backend") {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }

  return "border-sky-100 bg-sky-50 text-sky-700";
}

function ToolCard({
  tool,
  searchMode = false,
}: {
  tool: Tool;
  searchMode?: boolean;
}) {
  const Icon = tool.icon;
  const status = getStatusBadge(tool);

  return (
    <Link
      href={tool.href}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_24px_70px_rgba(30,41,59,0.15)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/80 to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition duration-200 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white">
          <Icon size={20} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <span className={status.className}>{status.label}</span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <span
          className={[
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            processingClassName(tool.capabilities.processingMode),
          ].join(" ")}
        >
          {processingLabel(tool.capabilities.processingMode)}
        </span>

        {tool.popular ? (
          <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Popular
          </span>
        ) : null}

        {tool.featured ? (
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
            Featured
          </span>
        ) : null}
      </div>

      <h3 className="relative mt-4 text-lg font-semibold tracking-[-0.035em] text-slate-950">
        {tool.title}
      </h3>

      <p className="relative mt-2 text-sm font-medium leading-6 text-slate-600">
        {searchMode ? tool.menuDescription : tool.description}
      </p>

      <div className="relative mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-indigo-700">
        {tool.status === "coming-soon" ? "View workflow" : "Open tool"}
        <ArrowRight
          size={16}
          className="transition duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
        active
          ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-700",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function EmptyResults({
  onReset,
}: {
  onReset: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
        <Search size={22} />
      </div>

      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
        No matching PDFMantra tools found
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        Try another search phrase or reset the filters. Searches like “merge
        PDFs”, “scan text”, “compress file”, and “add signature” are supported.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
      >
        Reset filters
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [processingFilter, setProcessingFilter] =
    useState<ProcessingFilter>("all");

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
      const categoryMatches =
        categoryFilter === "all" || tool.category === categoryFilter;

      const statusMatches =
        statusFilter === "all" || tool.status === statusFilter;

      const processingMatches =
        processingFilter === "all" ||
        tool.capabilities.processingMode === processingFilter;

      return categoryMatches && statusMatches && processingMatches;
    });
  }, [
    categoryFilter,
    processingFilter,
    searchRankedTools,
    statusFilter,
  ]);

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

      <main className="min-h-screen bg-[#f7f9fe] text-slate-950">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200/80">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-10rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-indigo-200/45 blur-3xl" />
            <div className="absolute right-[-9rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-cyan-100/70 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="grid gap-8 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
                  <Sparkles size={14} />
                  PDFMantra Tools Dashboard
                </div>

                <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-[4.1rem]">
                  Find the exact PDF tool
                  <span className="block bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-950 bg-clip-text text-transparent">
                    before you waste a click.
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                  Search by intent, filter by tool type, and instantly see what is
                  live, beta, browser-first, or part of PDFMantra’s backend roadmap.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    {WORKING_TOOLS.length} editor-ready workflows
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Brain size={15} className="text-violet-600" />
                    {BACKEND_TOOLS.length} backend-grade roadmap tools
                  </div>
                </div>
              </div>

              <div className="rounded-[2.2rem] border border-slate-200 bg-white p-5 shadow-[0_32px_100px_rgba(15,23,42,0.14)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                      Smart Tool Search
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      Search PDFMantra naturally
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Search size={20} />
                  </div>
                </div>

                <label className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
                  <Search size={19} className="shrink-0 text-slate-400" />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Try merge PDFs, scan text, reduce file size..."
                    className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  />

                  {normalizedQuery ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                      aria-label="Clear tools search"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                      {tools.length}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Total mapped
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                      {POPULAR_TOOLS.length}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Popular
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                      {BACKEND_TOOLS.length}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Backend
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED TOOLS */}
        {!normalizedQuery &&
        categoryFilter === "all" &&
        statusFilter === "all" &&
        processingFilter === "all" ? (
          <section className="border-b border-slate-200/80 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
              <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    Featured tools
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                    Start with PDFMantra’s most important workflows
                  </h2>
                </div>

                <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                  These are the tools that should anchor product discovery across
                  the homepage, header mega menu, and future tools landing pages.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {FEATURED_TOOLS.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* DASHBOARD FILTERS */}
        <section className="border-b border-slate-200/80 bg-[#f7f9fe]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <div className="rounded-[2.2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    <SlidersHorizontal size={14} />
                    Tool filters
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-3xl">
                    Narrow the dashboard by workflow, maturity, and engine
                  </h2>
                </div>

                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Reset {activeFilterCount} active filter
                    {activeFilterCount === 1 ? "" : "s"}
                    <X size={15} />
                  </button>
                ) : null}
              </div>

              <div className="mt-7 grid gap-6">
                {/* Category Filters */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Layers3 size={16} className="text-indigo-600" />
                    Category
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <FilterChip
                      active={categoryFilter === "all"}
                      label="All Categories"
                      onClick={() => setCategoryFilter("all")}
                    />

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

                {/* Status Filters */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <BadgeCheck size={16} className="text-indigo-600" />
                    Product status
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {STATUS_FILTERS.map((status) => (
                      <FilterChip
                        key={status.id}
                        active={statusFilter === status.id}
                        label={status.label}
                        onClick={() => setStatusFilter(status.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Processing Filters */}
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Cpu size={16} className="text-indigo-600" />
                    Processing model
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {PROCESSING_FILTERS.map((filter) => {
                      const active = processingFilter === filter.id;

                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setProcessingFilter(filter.id)}
                          className={[
                            "rounded-[1.45rem] border p-4 text-left transition duration-200",
                            active
                              ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                              : "border-slate-200 bg-slate-50 text-slate-950 hover:border-indigo-200 hover:bg-white",
                          ].join(" ")}
                        >
                          <div className="text-sm font-semibold">
                            {filter.label}
                          </div>
                          <div
                            className={[
                              "mt-1 text-xs font-medium leading-5",
                              active ? "text-indigo-100" : "text-slate-500",
                            ].join(" ")}
                          >
                            {filter.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOOL RESULTS */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  {normalizedQuery ? "Search results" : "Tool directory"}
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  {filteredTools.length} tool
                  {filteredTools.length === 1 ? "" : "s"} matched
                  {normalizedQuery ? ` “${normalizedQuery}”` : " your view"}
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                <Filter size={15} className="text-indigo-600" />
                {activeFilterCount === 0
                  ? "Showing full registry"
                  : `${activeFilterCount} active filter${
                      activeFilterCount === 1 ? "" : "s"
                    }`}
              </div>
            </div>

            {filteredTools.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : normalizedQuery ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} searchMode />
                ))}
              </div>
            ) : (
              <div className="space-y-10">
                {groupedTools.map((group) => (
                  <section key={group.category.id}>
                    <div className="mb-5 grid gap-3 lg:grid-cols-[0.68fr_1.32fr] lg:items-end">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                          {group.category.menuLabel}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-slate-950">
                          {group.category.label}
                        </h3>
                      </div>

                      <p className="max-w-3xl text-sm font-medium leading-7 text-slate-600 lg:justify-self-end">
                        {group.category.description}
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {group.tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM PRODUCT ROADMAP */}
        <section className="border-t border-slate-200/80 bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
                  <ShieldCheck size={14} />
                  PDFMantra architecture
                </div>

                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  Browser where it helps. Backend where it matters.
                </h2>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
                  Visual editing and quick interactions can stay browser-first.
                  OCR, compression, reliable conversion, security, and redaction
                  should be powered by PDFMantra’s own processing backend.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/editor"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-300"
                  >
                    Open Editor Beta
                    <ArrowRight size={17} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProcessingFilter("backend");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                      setQuery("");
                    }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    View backend tools
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700">
                    <FileText size={20} />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                    Browser-side workspace
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-7 text-indigo-100">
                    Editor, visual overlays, highlights, signatures, and fast UI-led
                    PDF interactions.
                  </p>
                </div>

                <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700">
                    <Brain size={20} />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                    Backend-grade processing
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-7 text-indigo-100">
                    OCR, compression, conversions, repair, password protection,
                    and true redaction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
