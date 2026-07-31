"use client";

import Link from "next/link";
import { Search, SearchX, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import {
  getHomepageToolGridCategories,
  getHomepageToolGridTools,
  isToolInHomepageGridCategory,
  matchesHomepageToolQuery,
  type HomepageToolGridCategoryId,
} from "@/lib/home/homepage-tools";

export function HomeToolsGrid({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<HomepageToolGridCategoryId>("all");
  const tools = useMemo(
    () => getHomepageToolGridTools(capabilities),
    [capabilities],
  );
  const categories = useMemo(
    () => getHomepageToolGridCategories(tools),
    [tools],
  );

  const matches = useMemo(() => {
    const hasQuery = Boolean(query.trim());

    return tools.filter((tool) => {
      if (
        !hasQuery &&
        !isToolInHomepageGridCategory(tool, category)
      ) {
        return false;
      }

      return matchesHomepageToolQuery(tool, query);
    });
  }, [category, query, tools]);

  const selectCategory = (
    nextCategory: HomepageToolGridCategoryId,
    focus = false,
  ) => {
    setCategory(nextCategory);
    setQuery("");
    if (focus) {
      requestAnimationFrame(() => {
        document
          .getElementById(`home-tool-tab-${nextCategory}`)
          ?.focus();
      });
    }
  };

  return (
    <section
      id="pdf-tools"
      className="home-section scroll-mt-24 border-b border-[var(--home-border)] py-8 sm:py-10"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">PDF tools</h2>
        <div className="mx-auto max-w-3xl">
          <div className="relative mx-auto max-w-2xl">
            <label htmlFor="home-tool-search" className="sr-only">
              Search PDF tools
            </label>
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-600"
              aria-hidden="true"
            />
            <input
              id="home-tool-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools — merge, sign, OCR, convert…"
              className="min-h-12 w-full rounded-2xl border border-[var(--home-border)] bg-white pl-11 pr-12 text-[15px] font-semibold text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100"
                aria-label="Clear tool search"
              >
                <X size={17} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
          role="tablist"
          aria-label="PDF tool categories"
        >
          {categories.map((item) => {
            const selected = !query && category === item.id;
            return (
              <button
                key={item.id}
                id={`home-tool-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="home-tool-results"
                tabIndex={selected || (query && item.id === "all") ? 0 : -1}
                onClick={() => selectCategory(item.id)}
                onKeyDown={(event) => {
                  const currentIndex = categories.findIndex(
                    (categoryItem) => categoryItem.id === item.id,
                  );
                  let nextIndex = currentIndex;

                  if (event.key === "ArrowRight") {
                    nextIndex = (currentIndex + 1) % categories.length;
                  } else if (event.key === "ArrowLeft") {
                    nextIndex =
                      (currentIndex - 1 + categories.length) %
                      categories.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex = categories.length - 1;
                  } else {
                    return;
                  }

                  event.preventDefault();
                  selectCategory(categories[nextIndex].id, true);
                }}
                className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-violet-100 ${
                  selected
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-[var(--home-border)] bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            {matches.length} {matches.length === 1 ? "tool" : "tools"}
            {query ? ` matching “${query}”` : ""}
          </p>
          <Link
            href="/tools"
            className="min-h-11 shrink-0 content-center text-sm font-bold text-violet-700 outline-none hover:text-violet-900 focus-visible:ring-4 focus-visible:ring-violet-100"
          >
            Full directory
          </Link>
        </div>

        <div
          id="home-tool-results"
          role="tabpanel"
          aria-labelledby={`home-tool-tab-${query ? "all" : category}`}
          className="mt-3"
        >
          {matches.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {matches.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group flex min-h-[108px] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--home-border)] bg-white px-3 py-4 text-center outline-none transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[var(--home-subtle)] focus-visible:ring-4 focus-visible:ring-violet-100"
                    aria-label={`Open ${tool.title}`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-100">
                      <Icon size={21} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="line-clamp-2 text-[15px] font-bold leading-5 text-slate-900">
                      {tool.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--home-border)] bg-[var(--home-subtle)] px-6 text-center">
              <SearchX size={27} className="text-violet-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-slate-950">
                No matching PDF tool
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                Try a broader term such as “pages”, “image”, “sign”, or “text”.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
