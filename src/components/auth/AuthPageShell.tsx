import Link from "next/link";
import type { ReactNode } from "react";

interface AuthPageShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}

export function AuthPageShell({ title, subtitle, children }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-light)] bg-[var(--bg-card)]/96 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="display-font text-xl font-bold tracking-[-0.03em] text-[var(--violet-600)]">
            PDFMantra
          </Link>
          <Link href="/" className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--violet-600)]">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md">
          <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="mb-6">
              <p className="section-eyebrow">Secure account</p>
              <h1 className="display-font mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
