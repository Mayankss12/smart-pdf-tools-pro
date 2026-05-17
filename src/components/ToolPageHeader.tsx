import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ToolPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  children,
}: {
  readonly icon: LucideIcon;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly meta?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-panel)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-7 sm:py-7 lg:px-8 lg:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.16)_0%,rgba(101,80,232,0.06)_38%,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-[18%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(128,112,240,0.10)_0%,transparent_70%)]"
      />

      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_34px_rgba(101,80,232,0.22)]">
              <Icon size={21} />
            </div>
            <div className="eyebrow-chip">{eyebrow}</div>
          </div>

          <h1 className="display-font mt-5 max-w-5xl text-[2.15rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.7rem] lg:text-[3.1rem]">
            {title}
          </h1>

          <p className="mt-4 max-w-4xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
            {description}
          </p>
        </div>

        {meta ? (
          <div className="relative rounded-[1.35rem] border border-[var(--border-light)] bg-white/92 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            {meta}
          </div>
        ) : null}
      </div>

      {children ? <div className="relative mt-6">{children}</div> : null}
    </section>
  );
}
