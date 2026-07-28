import Link from "next/link";
import {
  ArrowRight,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import { BackendConversionClient } from "@/components/BackendConversionClient";
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
                <BackendConversionClient
                  conversionId={conversion.id}
                  enabled={enabled}
                  disabledReason={reason}
                  acceptedExtensions={conversion.acceptedExtensions}
                  maxFileSize={capability?.limits.maxFileSize ?? conversion.maxFileSize}
                  sourceFormat={conversion.sourceFormat}
                  destinationFormat={conversion.destinationFormat}
                  isUrlSource={conversion.sourceFormat === "url"}
                />

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
                {!enabled ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Required configuration
                    </div>
                    <ul className="mt-2 space-y-1 break-all font-mono text-[11px] leading-5 text-slate-600">
                      <li>PDFMANTRA_PROCESSING_API_BASE_URL</li>
                      <li>PDFMANTRA_PROCESSING_API_TOKEN</li>
                      <li>
                        PDFMANTRA_PROCESSING_CAPABILITIES={conversion.capabilityKey}
                      </li>
                      <li>PDFMANTRA_CONVERSION_OVERRIDES_JSON</li>
                      <li>NEXT_PUBLIC_SUPABASE_URL</li>
                      <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
                      <li>SUPABASE_SECRET_KEY</li>
                    </ul>
                  </div>
                ) : null}
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
