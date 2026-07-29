import Link from "next/link";
import { ArrowRight, FileUp } from "lucide-react";

export function HomeFinalCta() {
  return (
    <section className="bg-[#fbfaf7] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-8 overflow-hidden rounded-[2rem] bg-violet-700 px-6 py-10 text-white shadow-[0_30px_90px_rgba(78,52,180,0.24)] sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] !text-violet-200">
            Ready when you are
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] !text-white sm:text-5xl">
            Your next PDF task starts here.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 !text-white/72 sm:text-base">
            Let a file point you to the right workflow, or browse the complete
            command center.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <a
            href="#start-with-file"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-violet-800 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            <FileUp size={16} />
            Choose a file
          </a>
          <Link
            href="/tools"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/8 px-6 text-sm font-bold text-white transition hover:bg-white/14 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            Browse all PDF tools
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

