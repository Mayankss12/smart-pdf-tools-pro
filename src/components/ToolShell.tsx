import { Header } from "@/components/Header";
import type { ReactNode } from "react";

export function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf8ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/60 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/55 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-11">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                PDFMantra Tool Workspace
              </div>

              <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                {title}
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/82 p-5 shadow-[0_18px_50px_rgba(91,63,193,0.08)] backdrop-blur sm:p-6 lg:p-7">
            {children}
          </div>
        </section>
      </main>
    </>
  );
}
