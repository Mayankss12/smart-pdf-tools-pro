import Link from "next/link";
import {
  ArrowRight,
  FileWarning,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import { Header } from "@/components/Header";
import { getPublicConversionCapability } from "@/lib/conversions/capabilities";
import { getConversionById } from "@/lib/conversions/registry";

export function ConversionCapabilityShell({
  conversionId,
}: {
  readonly conversionId: string;
}) {
  const conversion = getConversionById(conversionId);
  if (!conversion) return null;

  const capability = getPublicConversionCapability(conversionId);
  const enabled = capability?.enabled ?? false;
  const reason =
    capability?.disabledReason ??
    conversion.disabledReason ??
    "This conversion is currently unavailable.";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-11 text-white sm:px-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ring-1 ring-white/20">
                <ServerCog size={15} />
                {enabled ? "Provider available" : "Backend required"}
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                {conversion.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-indigo-50">
                {conversion.description}
              </p>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <section className="p-6 sm:p-8">
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <FileWarning className="mx-auto text-amber-600" size={38} />
                  <h2 className="mt-4 text-xl font-bold">
                    {enabled
                      ? "Provider capability detected"
                      : "Conversion is not enabled"}
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
                    {reason}
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-6 inline-flex min-w-48 items-center justify-center rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-500"
                  >
                    Upload unavailable
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <ShieldCheck className="text-emerald-600" size={20} />
                    <div className="mt-2 text-sm font-bold">No fake output</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      PDFMantra never renames a different format or simulates a completed conversion.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <LockKeyhole className="text-violet-600" size={20} />
                    <div className="mt-2 text-sm font-bold">Private job boundary</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      When configured, jobs require authorization and private expiring output delivery.
                    </p>
                  </div>
                </div>
              </section>

              <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                <h2 className="text-lg font-bold">Quality contract</h2>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  {conversion.qualityNotice}
                </p>
                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold leading-6 text-violet-800">
                  {conversion.privacyMessage}
                </div>
                <Link
                  href="/tools"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700"
                >
                  Browse available tools
                  <ArrowRight size={16} />
                </Link>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
