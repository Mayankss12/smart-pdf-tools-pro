"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  matchesHomepageToolQuery,
  type ToolDiscoveryItem,
} from "@/lib/home/homepage-tools";

const MAX_RESULTS = 10;

export function HeaderToolSearch({
  idPrefix,
  items,
  mobile = false,
  enableShortcut = false,
  onNavigate,
}: {
  readonly idPrefix: string;
  readonly items: readonly ToolDiscoveryItem[];
  readonly mobile?: boolean;
  readonly enableShortcut?: boolean;
  readonly onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    return items
      .filter((item) => matchesHomepageToolQuery(item.tool, normalizedQuery))
      .slice(0, MAX_RESULTS);
  }, [items, query]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, [pathname]);

  useEffect(() => {
    if (!enableShortcut) return;

    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [enableShortcut]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const listboxId = `${idPrefix}-results`;
  const activeResult =
    activeIndex >= 0 ? results[activeIndex] : undefined;

  function moveActiveResult(direction: 1 | -1) {
    if (!results.length) return;
    setOpen(true);
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : results.length - 1;
      return (current + direction + results.length) % results.length;
    });
  }

  function closeAfterNavigation() {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    onNavigate?.();
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${mobile ? "w-full" : "w-[clamp(200px,18vw,250px)]"}`}
    >
      <label htmlFor={`${idPrefix}-input`} className="sr-only">
        Search PDF tools
      </label>
      <Search
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={`${idPrefix}-input`}
        type="search"
        role="combobox"
        value={query}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(Boolean(event.target.value.trim()));
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActiveResult(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActiveResult(-1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          } else if (
            event.key === "Enter" &&
            activeResult?.availability === "ready"
          ) {
            event.preventDefault();
            closeAfterNavigation();
            router.push(activeResult.tool.href);
          }
        }}
        placeholder="Search PDF tools"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          activeResult ? `${idPrefix}-result-${activeResult.tool.id}` : undefined
        }
        className="h-10 w-full rounded-xl border border-violet-100 bg-slate-50 pl-9 pr-9 text-sm font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-500 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
            setActiveIndex(-1);
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 outline-none hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100"
          aria-label="Clear tool search"
        >
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="PDF tool search results"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] max-h-80 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-[0_18px_48px_rgba(36,25,86,0.16)]"
        >
          {results.length ? (
            results.map((item, index) => {
              const Icon = item.tool.icon;
              const resultId = `${idPrefix}-result-${item.tool.id}`;
              const className = `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition ${
                index === activeIndex
                  ? "bg-violet-50 text-violet-800"
                  : "text-slate-800 hover:bg-slate-50"
              }`;

              if (item.availability === "coming-soon") {
                return (
                  <div
                    key={item.tool.id}
                    id={resultId}
                    role="option"
                    aria-selected={index === activeIndex}
                    aria-disabled="true"
                    className={`${className} cursor-not-allowed opacity-65`}
                  >
                    <Icon
                      size={17}
                      className="shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {item.tool.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Coming soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.tool.id}
                  id={resultId}
                  role="option"
                  aria-selected={index === activeIndex}
                  href={item.tool.href}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={closeAfterNavigation}
                  className={className}
                >
                  <Icon
                    size={17}
                    className="shrink-0 text-violet-600"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {item.tool.title}
                  </span>
                </Link>
              );
            })
          ) : (
            <p
              role="status"
              className="px-3 py-5 text-center text-sm font-medium text-slate-500"
            >
              No PDF tools match “{query.trim()}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
