"use client";

import Link from "next/link";
import {
  ArrowRight,
  Search,
  SearchX,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import {
  getHomepageExplorerTools,
  HOMEPAGE_EXPLORER_CATEGORIES,
  isToolInHomepageCategory,
  type HomepageExplorerCategoryId,
} from "@/lib/home/homepage-tools";

const RESULT_LIMIT = 12;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ToolExplorer({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<HomepageExplorerCategoryId>("popular");
  const explorerTools = useMemo(() => getHomepageExplorerTools(), []);

  const matches = useMemo(() => {
    const normalizedQuery = normalize(query);
    return explorerTools.filter((tool) => {
      if (!isToolInHomepageCategory(tool, category)) return false;
      if (!normalizedQuery) return true;
      const corpus = [
        tool.title,
        tool.description,
        tool.menuDescription,
        ...tool.search.aliases,
        ...tool.search.keywords,
        ...tool.search.useCases,
      ]
        .map(normalize)
        .join(" ");
      return normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => corpus.includes(token));
    });
  }, [category, explorerTools, query]);

  return (
    <section
      id="tool-explorer"
      className="home-section-alt border-y border-[var(--home-border)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="section-eyebrow">
              Tool directory
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              What do you need to do?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Search the complete PDFMantra toolset, then go straight to the
              workflow you need.
            </p>
          </div>

          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-600"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search PDF tools — convert, sign, remove pages…"
              className="min-h-14 w-full rounded-2xl border border-[var(--home-border)] bg-white pl-12 pr-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              aria-label="Search PDF tools"
            />
          </div>
        </div>

        <div
          className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
          role="tablist"
          aria-label="Tool categories"
        >
          {HOMEPAGE_EXPLORER_CATEGORIES.map((item) => {
            const selected = category === item.id;
            return (
              <button
                key={item.id}
                id={`homepage-tool-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="homepage-tool-results"
                onClick={() => setCategory(item.id)}
                onKeyDown={(event) => {
                  const currentIndex = HOMEPAGE_EXPLORER_CATEGORIES.findIndex(
                    (categoryItem) => categoryItem.id === item.id,
                  );
                  let nextIndex = currentIndex;
                  if (event.key === "ArrowRight") {
                    nextIndex =
                      (currentIndex + 1) %
                      HOMEPAGE_EXPLORER_CATEGORIES.length;
                  } else if (event.key === "ArrowLeft") {
                    nextIndex =
                      (currentIndex -
                        1 +
                        HOMEPAGE_EXPLORER_CATEGORIES.length) %
                      HOMEPAGE_EXPLORER_CATEGORIES.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex =
                      HOMEPAGE_EXPLORER_CATEGORIES.length - 1;
                  } else {
                    return;
                  }
                  event.preventDefault();
                  const nextCategory =
                    HOMEPAGE_EXPLORER_CATEGORIES[nextIndex];
                  setCategory(nextCategory.id);
                  document
                    .getElementById(`homepage-tool-tab-${nextCategory.id}`)
                    ?.focus();
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

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            {matches.length} {matches.length === 1 ? "tool" : "tools"} found
          </p>
          <Link
            href="/tools"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700 transition hover:text-violet-900"
          >
            View all tools
            <ArrowRight size={15} />
          </Link>
        </div>

        <div
          id="homepage-tool-results"
          role="tabpanel"
          aria-labelledby={`homepage-tool-tab-${category}`}
          className="mt-5"
        >
          {matches.length ? (
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--home-border)] bg-white sm:grid-cols-2 lg:grid-cols-3">
              {matches.slice(0, RESULT_LIMIT).map((tool) => {
                const Icon = tool.icon;
                const capability = capabilities[tool.id];
                const available =
                  capability?.enabled ??
                  (tool.status === "working" || tool.status === "beta");

                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className={`group grid min-h-[118px] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 bg-white p-4 outline-none transition hover:bg-[var(--home-subtle)] focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-100 ${
                      !available ? "opacity-70" : ""
                    }`}
                    aria-label={`${tool.title}. ${
                      available ? "Open tool." : "Coming soon."
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold text-slate-950">
                        {tool.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">
                        {tool.description}
                      </span>
                      {!available ? (
                        <span className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          Coming soon
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      size={15}
                      className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--home-border)] bg-white px-6 text-center">
              <SearchX size={28} className="text-violet-600" />
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                No matching tool yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try a broader term such as “sign”, “image”, “pages”, or
                “compress”, or browse the complete directory.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
