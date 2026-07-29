import { MonitorSmartphone } from "lucide-react";

import { getHomepageProductMetrics } from "@/lib/home/homepage-tools";

export function ProductProof() {
  const metrics = getHomepageProductMetrics();
  const proof = [
    {
      value: metrics.browserTools,
      label: "working browser tools",
    },
    {
      value: metrics.conversionWorkflows,
      label: "registered conversion workflows",
    },
    {
      value: metrics.editorCapabilities,
      label: "major editor commands",
    },
  ] as const;

  return (
    <section className="border-y border-violet-100 bg-white py-12">
      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {proof.map((item) => (
          <div key={item.label} className="border-l-2 border-violet-200 pl-5">
            <div className="text-4xl font-bold tracking-[-0.055em] text-slate-950">
              {item.value}
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {item.label}
            </p>
          </div>
        ))}
        <div className="border-l-2 border-violet-200 pl-5">
          <MonitorSmartphone size={31} className="text-violet-700" />
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Responsive workspace for desktop and mobile
          </p>
        </div>
      </div>
    </section>
  );
}

