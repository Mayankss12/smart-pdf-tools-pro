import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, Sparkles } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { GITA_WISDOM_VERSES } from "@/data/gitaWisdom";

export function generateStaticParams() {
  return GITA_WISDOM_VERSES.map((verse) => ({ id: verse.id }));
}

export default async function GitaMeaningPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const verse = GITA_WISDOM_VERSES.find((item) => item.id === id);

  if (!verse) {
    notFound();
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
            >
              <ArrowLeft size={16} />
              Back to homepage
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="eyebrow-chip">
                <BookOpenText size={13} />
                Bhagavad Gita · Chapter {verse.chapter}, Verse {verse.verse}
              </div>
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                {verse.theme}
              </div>
            </div>

            <h1 className="display-font mt-6 max-w-5xl text-[2.3rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.45rem]">
              Meaning and life guidance from this shlok.
            </h1>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[1.8rem] border border-[var(--violet-border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] sm:p-7">
              <div className="relative px-10 py-4 text-center sm:px-14">
                <span className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-[1.35rem] font-bold leading-none text-[#dd8450]">
                  ॐ
                </span>
                <span className="absolute left-0 top-1/2 flex -translate-y-1/2 gap-1.5" aria-hidden="true">
                  <span className="h-16 w-px rounded-full bg-[var(--text-primary)]/68" />
                  <span className="h-16 w-px rounded-full bg-[var(--text-primary)]/68" />
                </span>
                <span className="absolute right-0 top-1/2 flex -translate-y-1/2 gap-1.5" aria-hidden="true">
                  <span className="h-16 w-px rounded-full bg-[var(--text-primary)]/68" />
                  <span className="h-16 w-px rounded-full bg-[var(--text-primary)]/68" />
                </span>
                <div
                  className="whitespace-pre-line pt-5 text-[1.08rem] font-semibold leading-9 tracking-[0.01em] text-[var(--text-primary)] sm:text-[1.22rem]"
                  style={{ fontFamily: '\"Noto Sans Devanagari\", \"Nirmala UI\", \"Kohinoor Devanagari\", sans-serif' }}
                >
                  {verse.sanskrit}
                </div>
              </div>
            </article>

            <aside className="rounded-[1.8rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                Meaning
              </div>
              <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                {verse.meaning}
              </p>

              <div className="mt-6 border-t border-[var(--border-light)] pt-6">
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
            </aside>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 text-sm font-medium leading-7 text-[var(--text-secondary)] shadow-[var(--shadow-soft)] sm:p-6">
            <span className="font-bold text-[var(--text-primary)]">Reference:</span>{" "}
            Bhagavad Gita, Chapter {verse.chapter}, Verse {verse.verse}. This chapter-and-verse format stays reliable across editions.
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
