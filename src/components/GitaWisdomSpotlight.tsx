"use client";

import { BookOpenText, ChevronRight, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  GITA_WISDOM_VERSES,
  type GitaWisdomVerse,
} from "@/data/gitaWisdom";

const VIEWED_STORAGE_KEY = "pdfmantra-gita-viewed-v1";

function readViewedIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(VIEWED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeViewedIds(ids: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(ids));
}

function chooseVerse(): GitaWisdomVerse {
  const viewedIds = readViewedIds();
  const unviewed = GITA_WISDOM_VERSES.filter((verse) => !viewedIds.includes(verse.id));
  const pool = unviewed.length > 0 ? unviewed : [...GITA_WISDOM_VERSES];
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex] ?? GITA_WISDOM_VERSES[0];
  const nextViewedIds = unviewed.length > 0 ? [...viewedIds, selected.id] : [selected.id];

  writeViewedIds(nextViewedIds);
  return selected;
}

export function GitaWisdomSpotlight() {
  const [verse, setVerse] = useState<GitaWisdomVerse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setVerse(chooseVerse());
  }, []);

  const referenceLabel = useMemo(() => {
    if (!verse) {
      return "";
    }

    return `Bhagavad Gita · Chapter ${verse.chapter}, Verse ${verse.verse}`;
  }, [verse]);

  if (!verse) {
    return (
      <div className="mx-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-[12px] font-semibold text-[var(--violet-600)]">
        <Sparkles size={13} />
        Loading today’s Gita wisdom…
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mx-auto inline-flex max-w-full items-center gap-3 rounded-full border border-[var(--violet-border)] bg-white/90 px-4 py-2.5 text-left shadow-[0_12px_30px_rgba(101,80,232,0.10)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--violet-600)] text-white shadow-[0_12px_28px_rgba(101,80,232,0.22)]">
          <BookOpenText size={15} />
        </span>

        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
            Gita wisdom · {verse.theme}
          </span>
          <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)] sm:text-sm">
            {verse.preview}
          </span>
        </span>

        <ChevronRight
          size={16}
          className="shrink-0 text-[var(--violet-600)] transition group-hover:translate-x-0.5"
        />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#18152e]/55 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.8rem] border border-[var(--violet-border)] bg-[var(--bg-card)] p-5 shadow-[0_32px_120px_rgba(24,21,46,0.32)] sm:p-7">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
              aria-label="Close Gita wisdom"
            >
              <X size={18} />
            </button>

            <div className="pr-12">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                {referenceLabel}
              </div>

              <h2 className="display-font mt-5 text-[1.85rem] font-bold leading-[1.18] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.2rem]">
                {verse.theme}
              </h2>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--violet-border)] bg-[var(--violet-50)] p-4 text-base font-semibold leading-8 text-[var(--text-primary)] whitespace-pre-line sm:p-5 sm:text-lg">
                {verse.sanskrit}
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--border-light)] bg-white p-4 sm:p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                  Meaning
                </div>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                  {verse.meaning}
                </p>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--border-light)] bg-white p-4 sm:p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                  Life lessons
                </div>
                <div className="mt-3 space-y-3">
                  {verse.lifeLessons.map((lesson) => (
                    <div
                      key={lesson}
                      className="flex items-start gap-3 text-sm font-medium leading-6 text-[var(--text-secondary)] sm:text-[15px]"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--violet-600)]" />
                      <span>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--violet-border)] bg-[var(--bg-panel)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)] sm:p-5">
                <span className="font-bold text-[var(--text-primary)]">Where to find it:</span>{" "}
                {referenceLabel}. Page numbers are edition-specific, so PDFMantra shows the stable chapter-and-verse reference rather than an unreliable page number.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
