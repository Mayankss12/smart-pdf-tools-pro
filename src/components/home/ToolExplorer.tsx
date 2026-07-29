"use client";

import Link from "next/link";
import {
  ArrowRight,
  CloudCog,
  Laptop,
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
      className="border-y border-slate-800 bg-[#20212b] py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">
              Tool command center
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] !text-white sm:text-4xl">
              What do you need to do?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 !text-white/65 sm:text-base">
              Search real tools and see where each task runs before you open
              your document.
            </p>
          </div>

          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-300"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search PDF tools — convert, sign, remove pages…"
              className="min-h-14 w-full rounded-2xl border border-white/15 bg-white/10 pl-12 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-white/42 focus:border-violet-300 focus:bg-white/14 focus:ring-4 focus:ring-violet-400/15"
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
                className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-violet-300/30 ${
                  selected
                    ? "border-violet-400 bg-violet-500 text-white"
                    : "border-white/14 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold !text-white/60" aria-live="polite">
            {matches.length} {matches.length === 1 ? "tool" : "tools"} found
          </p>
          <Link
            href="/tools"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-300 transition hover:text-white"
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
            <div className="grid gap-px overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {matches.slice(0, RESULT_LIMIT).map((tool) => {
                const Icon = tool.icon;
                const capability = capabilities[tool.id];
                const processingMode =
                  capability?.processingMode ??
                  (tool.capabilities.processingMode === "browser"
                    ? "browser"
                    : "provider");
                const available =
                  capability?.enabled ??
                  (tool.status === "working" || tool.status === "beta");

                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group flex min-h-[148px] flex-col bg-[#262732] p-5 outline-none transition hover:bg-[#2f3040] focus-visible:bg-[#2f3040] focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-400/40"
                    aria-label={`${tool.title}. ${
                      processingMode === "browser"
                        ? "Browser processing"
                        : available
                          ? "Secure provider processing"
                          : "Backend required and currently unavailable"
                    }.`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-violet-300">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold !text-white">
                          {tool.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 !text-white/55">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                          processingMode === "browser"
                            ? "bg-emerald-400/12 text-emerald-300"
                            : "bg-blue-400/12 text-blue-300"
                        }`}
                      >
                        {processingMode === "browser" ? (
                          <Laptop size={12} />
                        ) : (
                          <CloudCog size={12} />
                        )}
                        {processingMode === "browser"
                          ? "Browser"
                          : "Secure provider"}
                      </span>
                      {!available ? (
                        <span className="rounded-full bg-amber-400/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-300">
                          Unavailable
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-white/15 bg-white/5 px-6 text-center">
              <SearchX size={28} className="text-violet-300" />
              <h3 className="mt-4 text-lg font-bold !text-white">
                No matching tool yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 !text-white/55">
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

