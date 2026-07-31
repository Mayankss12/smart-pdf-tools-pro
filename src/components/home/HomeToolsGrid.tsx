"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import {
  getHomepageDiscoveryItems,
  getHomepageToolGridCategories,
  getHomepageToolGridTools,
  parseHomepageToolCategory,
  type HomepageToolGridCategoryId,
} from "@/lib/home/homepage-tools";

const CATEGORY_QUERY_PARAM = "toolCategory";

export function HomeToolsGrid({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const readyTools = useMemo(
    () => getHomepageToolGridTools(capabilities),
    [capabilities],
  );
  const categories = useMemo(
    () => getHomepageToolGridCategories(readyTools),
    [readyTools],
  );
  const [category, setCategory] =
    useState<HomepageToolGridCategoryId>("all");

  useEffect(() => {
    function readCategoryFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setCategory(
        parseHomepageToolCategory(params.get(CATEGORY_QUERY_PARAM)),
      );
    }

    readCategoryFromUrl();
    window.addEventListener("popstate", readCategoryFromUrl);
    return () => window.removeEventListener("popstate", readCategoryFromUrl);
  }, []);

  const items = useMemo(
    () => getHomepageDiscoveryItems(category, capabilities),
    [capabilities, category],
  );

  const selectCategory = (
    nextCategory: HomepageToolGridCategoryId,
    focus = false,
  ) => {
    setCategory(nextCategory);

    const nextUrl = new URL(window.location.href);
    if (nextCategory === "all") {
      nextUrl.searchParams.delete(CATEGORY_QUERY_PARAM);
    } else {
      nextUrl.searchParams.set(CATEGORY_QUERY_PARAM, nextCategory);
    }
    window.history.pushState({}, "", nextUrl);

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

        <div
          className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
          role="tablist"
          aria-label="PDF tool categories"
        >
          {categories.map((item, index) => {
            const selected = category === item.id;
            return (
              <button
                key={item.id}
                id={`home-tool-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="home-tool-results"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectCategory(item.id)}
                onKeyDown={(event) => {
                  let nextIndex = index;

                  if (event.key === "ArrowRight") {
                    nextIndex = (index + 1) % categories.length;
                  } else if (event.key === "ArrowLeft") {
                    nextIndex =
                      (index - 1 + categories.length) % categories.length;
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

        <div
          id="home-tool-results"
          role="tabpanel"
          aria-labelledby={`home-tool-tab-${category}`}
          className="mt-4"
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => {
              const Icon = item.tool.icon;
              const content = (
                <>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      item.availability === "ready"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Icon size={21} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="line-clamp-2 text-[15px] font-bold leading-5 text-slate-900">
                    {item.tool.title}
                  </span>
                  {item.availability === "coming-soon" ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Coming soon
                    </span>
                  ) : null}
                </>
              );

              if (item.availability === "coming-soon") {
                return (
                  <div
                    key={item.tool.id}
                    role="link"
                    aria-disabled="true"
                    className="flex min-h-[108px] min-w-0 cursor-not-allowed flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-center opacity-75"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.tool.id}
                  href={item.tool.href}
                  className="group flex min-h-[108px] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--home-border)] bg-white px-3 py-4 text-center outline-none transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[var(--home-subtle)] focus-visible:ring-4 focus-visible:ring-violet-100"
                  aria-label={`Open ${item.tool.title}`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
