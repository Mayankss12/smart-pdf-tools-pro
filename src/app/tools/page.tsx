"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";

import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import {
  TOOL_CATEGORIES,
  getPopularTools,
  searchTools,
  tools,
  type Tool,
  type ToolCategory,
} from "@/lib/tools";

type CategoryFilter = "all" | ToolCategory;

const AVAILABLE_TOOLS = tools.filter((tool) => tool.status === "working");
const POPULAR_TOOLS = getPopularTools(8).filter((tool) => tool.status === "working");
const QUICK_SEARCHES = ["edit PDF", "merge PDF", "split PDF", "compress PDF", "sign PDF", "watermark"];

function toneForCategory(category: ToolCategory): ToolGlyphTone {
  if (category === "organize" || category === "optimize") return "indigo";
  if (category === "convert") return "mint";
  return "violet";
}

function categoryLabel(category: ToolCategory) {
  return TOOL_CATEGORIES.find((item) => item.id === category)?.menuLabel ?? category;
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly count?: number;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-200",
        active
          ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white"
          : "border-[var(--cream-border)] bg-white text-[var(--text-secondary)] hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className={active ? "text-white/75" : "text-[var(--text-caption)]"}>{count}</span>
      ) : null}
    </button>
  );
}

function ToolTile({ tool, showCategory = true }: { readonly tool: Tool; readonly showCategory?: boolean }) {
  const Icon = tool.icon;
  const tone = toneForCategory(tool.category);

  return (
    <Link
      href={tool.href}
      className="group mx-auto grid w-full max-w-[190px] min-h-[168px] justify-items-center rounded-[1.35rem] border border-[var(--cream-border)] bg-white p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <ToolGlyph icon={Icon} tone={tone} size="md" />

      <div className="mt-5 min-w-0 text-center">
        <h2 className="text-[1.02rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
          {tool.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
          {tool.menuDescription || tool.description}
        </p>
      </div>

      {showCategory ? (
        <div className="mt-auto pt-5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-caption)]">
          {categoryLabel(tool.category)}
        </div>
      ) : null}
    </Link>
  );
}

function EmptyResults({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--violet-border)] bg-white px-6 py-14 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
        <Search size={22} />
      </div>
      <h3 className="display-font mt-5 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        No matching tools found
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm font-normal leading-7 text-[var(--text-secondary)]">
        Try another phrase or choose a category to return to the available PDFMantra tools.
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

  const normalizedQuery = query.trim();

  const searchRankedTools = useMemo(() => {
    if (!normalizedQuery) return AVAILABLE_TOOLS;

    const rankedIds = new Set(
      searchTools(normalizedQuery, { includeComingSoon: false })
        .map((result) => result.tool)
        .filter((tool) => tool.status === "working")
        .map((tool) => tool.id),
    );

    return AVAILABLE_TOOLS.filter((tool) => rankedIds.has(tool.id));
  }, [normalizedQuery]);

  const filteredTools = useMemo(() => {
    return searchRankedTools.filter((tool) => categoryFilter === "all" || tool.category === categoryFilter);
  }, [categoryFilter, searchRankedTools]);

  const categoryCounts = useMemo(() => {
    return TOOL_CATEGORIES.map((category) => ({
      ...category,
      count: AVAILABLE_TOOLS.filter((tool) => tool.category === category.id).length,
    })).filter((category) => category.count > 0);
  }, []);

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--cream-base)] text-[var(--text-primary)]">
        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-4xl text-center">
              <div className="eyebrow-chip mx-auto">
                <Sparkles size={13} />
                PDF tools command center
              </div>

              <h1 className="display-font mt-5 text-[2.35rem] font-semibold leading-[1.13] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.55rem]">
                Choose the right PDF tool fast.
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                Browse a premium library of PDF tools and start your task in seconds.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-white shadow-[var(--shadow-soft)]">
              <label className="flex min-h-[72px] items-center gap-4 px-5 sm:px-6">
                <Search size={20} className="shrink-0 text-[var(--violet-600)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search merge, split, compress, sign, watermark..."
                  className="w-full bg-transparent text-[15px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--cream-border)] bg-white text-[var(--text-muted)] transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                    aria-label="Clear tools search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </label>
            </div>

            <div className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2.5">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-2 text-[12px] font-semibold text-[var(--violet-600)] transition hover:bg-[var(--violet-100)]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-secondary)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">Popular tools</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Start with common PDF tasks
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
                These are the tools most users need first. Every tool shown here opens an available PDFMantra tool.
              </p>
            </div>

            <div className="mx-auto mt-7 grid max-w-[1180px] justify-center justify-items-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(175px,190px))]">
              {POPULAR_TOOLS.map((tool) => (
                <ToolTile key={`popular-${tool.id}`} tool={tool} showCategory={false} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2.5">
              <FilterChip
                active={categoryFilter === "all"}
                label="All tools"
                count={AVAILABLE_TOOLS.length}
                onClick={() => setCategoryFilter("all")}
              />
              {categoryCounts.map((category) => (
                <FilterChip
                  key={category.id}
                  active={categoryFilter === category.id}
                  label={category.menuLabel}
                  count={category.count}
                  onClick={() => setCategoryFilter(category.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--cream-secondary)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">{normalizedQuery ? "Search results" : "Available tools"}</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  {filteredTools.length} tool{filteredTools.length === 1 ? "" : "s"} available
                </h2>
              </div>

              {normalizedQuery || categoryFilter !== "all" ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--cream-border)] bg-white px-4 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                >
                  Reset view
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {filteredTools.length === 0 ? (
              <EmptyResults onReset={resetFilters} />
            ) : (
              <div className="mx-auto grid max-w-[1180px] justify-center justify-items-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(175px,190px))]">
                {filteredTools.map((tool) => (
                  <ToolTile key={tool.id} tool={tool} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
