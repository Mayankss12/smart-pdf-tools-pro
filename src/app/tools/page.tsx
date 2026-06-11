"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Layers, Search, X } from "lucide-react";

import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import { tools, type Tool, type ToolCategory } from "@/lib/tools";

type CategoryFilter = "all" | ToolCategory;

const CATEGORY_HUB_HREFS = new Set([
  "/tools/organize",
  "/tools/page-organization",
  "/tools/convert",
  "/tools/optimize",
  "/tools/edit",
  "/tools/security",
]);

const CATEGORY_OPTIONS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "organize", label: "Organize" },
  { id: "convert", label: "Convert" },
  { id: "optimize", label: "Optimize" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
];

const CATEGORY_ORDER: Record<ToolCategory, number> = {
  organize: 1,
  convert: 2,
  optimize: 3,
  edit: 4,
  security: 5,
};

function toneForCategory(category: string): ToolGlyphTone {
  if (category === "organize" || category === "optimize") return "indigo";
  if (category === "convert") return "mint";
  return "violet";
}

function getStatusRank(status: Tool["status"]) {
  if (status === "working") return 1;
  if (status === "beta") return 2;
  return 3;
}

function getVisibleTools() {
  return tools
    .filter((tool) => tool.visibility.showInToolsPage)
    .filter((tool) => !CATEGORY_HUB_HREFS.has(tool.href))
    .sort((a, b) => {
      const statusRank = getStatusRank(a.status) - getStatusRank(b.status);
      if (statusRank !== 0) return statusRank;

      const categoryRank = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      if (categoryRank !== 0) return categoryRank;

      return b.search.resultPriority - a.search.resultPriority;
    });
}

function getShortDescription(tool: Tool) {
  const text = tool.menuDescription || tool.description;

  if (text.length <= 74) return text;

  return `${text.slice(0, 71).trim()}...`;
}

function CategoryPill({
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
        "inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-[13px] font-semibold transition duration-200 sm:text-sm",
        active
          ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)]"
          : "border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ToolCard({ tool }: { readonly tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="group mx-auto grid min-h-[160px] w-full max-w-[172px] justify-items-center rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-4 text-center shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)] sm:min-h-[154px]"
    >
      <ToolGlyph icon={tool.icon} tone={toneForCategory(tool.category)} size="sm" />

      <h3 className="display-font mt-2 text-center text-[1.02rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
        {tool.title}
      </h3>

      <p className="mx-auto mt-2 max-w-[150px] text-center text-[12.25px] font-normal leading-5 text-[var(--text-secondary)]">
        {getShortDescription(tool)}
      </p>
    </Link>
  );
}

function EmptyState({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-[1.35rem] border border-dashed border-[var(--border-focus)] bg-[var(--bg-card)] px-6 py-10 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
        <Search size={18} />
      </div>

      <h3 className="display-font mt-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
        No tools found
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Try another category or search term.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--violet-600)] bg-[var(--violet-600)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-500)]"
      >
        Reset tools
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const visibleTools = useMemo(() => getVisibleTools(), []);
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

  function resetView() {
    setActiveCategory("all");
    setQuery("");
  }

  return (
    <>
      <Header />

      <main
        className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <section className="mx-auto max-w-[1600px] px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
              <Layers size={22} />
            </div>

            <h1 className="display-font text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              All PDF Tools
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {visibleTools.length} focused tools for every PDF task.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORY_OPTIONS.map((category) => (
              <CategoryPill
                key={category.id}
                active={activeCategory === category.id}
                label={category.label}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>

          <div className="mt-3 flex justify-center">
            <label className="inline-flex min-h-10 w-full max-w-md items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-card)] px-4 shadow-[var(--shadow-soft)] transition focus-within:border-[var(--border-focus)] focus-within:bg-white">
              <Search size={15} className="shrink-0 text-[var(--text-muted)]" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools..."
                className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </label>
          </div>

          {filteredTools.length === 0 ? (
            <EmptyState onReset={resetView} />
          ) : (
            <div className="mx-auto mt-8 grid max-w-[1320px] grid-cols-2 place-items-center justify-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
