"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Layers,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  TOOL_CATEGORIES,
  tools,
  type Tool,
  type ToolCategory,
} from "@/lib/tools";

type CategoryFilter = "all" | ToolCategory;

const CATEGORY_HUB_HREFS = new Set([
  "/tools/organize",
  "/tools/page-organization",
  "/tools/convert",
  "/tools/optimize",
  "/tools/edit",
  "/tools/security",
]);

const EXPERIENCE_LABELS: Record<Tool["capabilities"]["experience"], string> = {
  workspace: "Workspace",
  "quick-action": "Quick action",
  "guided-processing": "Guided flow",
};

const STATUS_LABELS: Record<Tool["status"], string> = {
  working: "Live",
  beta: "Coming soon",
  "coming-soon": "Coming soon",
};

function getVisibleTools() {
  return tools
    .filter((tool) => tool.visibility.showInToolsPage)
    .filter((tool) => !CATEGORY_HUB_HREFS.has(tool.href))
    .sort((a, b) => {
      const statusRank = getStatusRank(a.status) - getStatusRank(b.status);

      if (statusRank !== 0) return statusRank;

      const categoryRank = getCategoryRank(a.category) - getCategoryRank(b.category);

      if (categoryRank !== 0) return categoryRank;

      return b.search.resultPriority - a.search.resultPriority;
    });
}

function getStatusRank(status: Tool["status"]) {
  if (status === "working") return 1;
  if (status === "beta") return 2;
  return 3;
}

function getCategoryRank(category: ToolCategory) {
  return TOOL_CATEGORIES.find((item) => item.id === category)?.sortOrder ?? 99;
}

function getCategoryLabel(category: ToolCategory) {
  return TOOL_CATEGORIES.find((item) => item.id === category)?.menuLabel ?? category;
}

function getToolFeatures(tool: Tool) {
  const processing =
    tool.capabilities.needsBackendProcessing || !tool.isClientOnly
      ? "Backend needed"
      : "Browser-side";

  const experience = EXPERIENCE_LABELS[tool.capabilities.experience];

  const fileMode =
    tool.capabilities.supportsMultipleFiles || (tool.maxFiles ?? 1) > 1
      ? "Multi-file"
      : "Single PDF";

  return [processing, experience, fileMode];
}

function CategoryTab({
  active,
  label,
  count,
  onClick,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly count: number;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[11px] font-black",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { readonly status: Tool["status"] }) {
  const isLive = status === "working";

  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        isLive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ToolCard({ tool }: { readonly tool: Tool }) {
  const ToolIcon = tool.icon;
  const isLive = tool.status === "working";
  const features = getToolFeatures(tool);

  return (
    <Link
      href={tool.href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
          <ToolIcon size={20} />
        </div>

        <StatusBadge status={tool.status} />
      </div>

      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-violet-700">
          {tool.title}
        </h3>

        {tool.newTool ? (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700">
            New
          </span>
        ) : null}
      </div>

      <p className="mt-2 min-h-[52px] text-sm leading-relaxed text-slate-500">
        {tool.menuDescription || tool.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {features.map((feature) => (
          <span
            key={feature}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          >
            {feature}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {getCategoryLabel(tool.category)}
        </div>

        <div
          className={[
            "flex items-center gap-2 text-sm font-bold transition-all group-hover:gap-3",
            isLive ? "text-violet-600" : "text-slate-500",
          ].join(" ")}
        >
          Open workspace
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  onReset,
}: {
  readonly onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-violet-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <Search size={20} />
      </div>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
        No tools found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try another search term or switch back to all tools.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
      >
        Reset view
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const visibleTools = useMemo(() => getVisibleTools(), []);

  const categoryTabs = useMemo(() => {
    return TOOL_CATEGORIES.map((category) => ({
      ...category,
      count: visibleTools.filter((tool) => tool.category === category.id).length,
    })).filter((category) => category.count > 0);
  }, [visibleTools]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredTools = useMemo(() => {
    return visibleTools.filter((tool) => {
      const matchesCategory =
        activeCategory === "all" || tool.category === activeCategory;

      const matchesSearch =
        !normalizedQuery ||
        [
          tool.title,
          tool.shortTitle,
          tool.description,
          tool.menuDescription,
          tool.category,
          ...tool.search.aliases,
          ...tool.search.keywords,
          ...tool.search.useCases,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, normalizedQuery, visibleTools]);

  const activeCategoryLabel =
    activeCategory === "all" ? "All PDF Tools" : getCategoryLabel(activeCategory);

  function resetView() {
    setActiveCategory("all");
    setQuery("");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Layers size={22} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              All PDF Tools
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
              {visibleTools.length} focused tools for every PDF task. Filter by category, open the right workspace, and export clean files with PDFMantra.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <CategoryTab
                  active={activeCategory === "all"}
                  label="All"
                  count={visibleTools.length}
                  onClick={() => setActiveCategory("all")}
                />

                {categoryTabs.map((category) => (
                  <CategoryTab
                    key={category.id}
                    active={activeCategory === category.id}
                    label={category.menuLabel}
                    count={category.count}
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>

              <label className="flex min-h-11 w-full items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 transition focus-within:border-violet-300 focus-within:bg-white lg:max-w-[340px]">
                <Search size={17} className="shrink-0 text-violet-600" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tools..."
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 transition hover:text-violet-600"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Choose",
                description: "Pick a focused PDF tool",
              },
              {
                icon: CheckCircle2,
                title: "Work",
                description: "Use clean workspace controls",
              },
              {
                icon: Clock3,
                title: "Export",
                description: "Download your output file",
              },
            ].map((step) => {
              const StepIcon = step.icon;

              return (
                <div key={step.title} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                    <StepIcon size={17} />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {activeCategoryLabel}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredTools.length} tool{filteredTools.length === 1 ? "" : "s"}
                {query ? ` for “${query}”` : ""}.
              </p>
            </div>

            {activeCategory !== "all" || query ? (
              <button
                type="button"
                onClick={resetView}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                Reset
                <X size={15} />
              </button>
            ) : null}
          </div>

          {filteredTools.length === 0 ? (
            <EmptyState onReset={resetView} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
