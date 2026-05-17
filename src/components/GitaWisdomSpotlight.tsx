"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setVerse(chooseVerse());
  }, []);

  if (!verse) {
    return <div className="mx-auto h-[82px] w-full max-w-[760px]" aria-hidden="true" />;
  }

  return (
    <Link
      href={`/gita/${verse.id}`}
      aria-label={`Open meaning for Bhagavad Gita Chapter ${verse.chapter}, Verse ${verse.verse}`}
      className="group relative mx-auto block w-full max-w-[790px] px-12 py-2.5 text-center transition duration-200 hover:-translate-y-0.5"
    >
      <span className="pointer-events-none absolute left-1/2 top-0 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-[1.18rem] font-bold leading-none text-[#dd8450] transition group-hover:text-[#d77337]">
        ॐ
      </span>

      <span className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 gap-1.5" aria-hidden="true">
        <span className="h-12 w-px rounded-full bg-[var(--text-primary)]/68" />
        <span className="h-12 w-px rounded-full bg-[var(--text-primary)]/68" />
      </span>

      <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 gap-1.5" aria-hidden="true">
        <span className="h-12 w-px rounded-full bg-[var(--text-primary)]/68" />
        <span className="h-12 w-px rounded-full bg-[var(--text-primary)]/68" />
      </span>

      <span
        className="block whitespace-pre-line pt-4 text-[13px] font-medium leading-6 tracking-[0.01em] text-[var(--text-primary)] sm:text-[14px] sm:leading-6"
        style={{ fontFamily: '"Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", sans-serif' }}
      >
        {verse.sanskrit}
      </span>
    </Link>
  );
}
