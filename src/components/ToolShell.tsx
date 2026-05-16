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

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="hero-aurora hero-grid relative overflow-hidden border-b border-white/10 px-6 py-12 text-[#fffaf3] sm:px-10 lg:px-14 lg:py-14">
              <div className="absolute right-[-120px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-180px] left-[-120px] h-96 w-96 rounded-full bg-[#c5a467]/18 blur-3xl" />

              <div className="relative max-w-4xl">
                <div className="eyebrow-chip">PDFMantra Tool Workspace</div>
                <h1 className="mt-5 max-w-4xl text-5xl leading-[0.94] text-[#fffaf3] sm:text-6xl lg:text-7xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[#f4ecdf] sm:text-lg">
                  {description}
                </p>
              </div>
            </section>

            <section className="bg-[#fbf7f0] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="rounded-[2rem] border border-[#ddcfbf] bg-[#fffaf3] p-5 shadow-[0_18px_48px_rgba(84,69,51,0.10)] sm:p-6 lg:p-7">
                {children}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
