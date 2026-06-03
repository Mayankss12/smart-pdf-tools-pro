import type { LucideIcon } from "lucide-react";

export type ToolHeroStat = {
  label: string;
  value: string | number;
};

export type ToolHeroProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  stats?: ToolHeroStat[];
};

export function ToolHero({
  icon: Icon,
  title,
  description,
  stats = [],
}: ToolHeroProps) {
  const visibleStats = stats.slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-light)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.20)_0%,rgba(101,80,232,0.08)_42%,rgba(255,255,255,0)_72%)]" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14)_0%,rgba(139,92,246,0.05)_45%,rgba(255,255,255,0)_75%)]" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_18px_40px_rgba(101,80,232,0.25)]">
            <Icon size={26} strokeWidth={2.4} />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--violet-700)]">
              PDFMantra Tool
            </p>

            <h1 className="text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {visibleStats.length > 0 ? (
          <div className="grid min-w-full grid-cols-1 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-slate-50/70 sm:grid-cols-3 lg:min-w-[360px]">
            {visibleStats.map((stat, index) => (
              <div
                key={`${stat.label}-${index}`}
                className="border-b border-[var(--border-light)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
