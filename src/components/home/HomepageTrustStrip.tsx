import {
  CloudCog,
  Download,
  Laptop,
  MonitorSmartphone,
  UserCheck,
} from "lucide-react";

const POINTS = [
  {
    icon: Laptop,
    text: "Supported tools process files in your browser",
  },
  { icon: Download, text: "No software installation" },
  { icon: MonitorSmartphone, text: "Works on desktop and mobile" },
  { icon: CloudCog, text: "Backend tools are clearly labelled" },
  { icon: UserCheck, text: "Provider workflows require authentication" },
] as const;

export function HomepageTrustStrip() {
  return (
    <section
      aria-label="Processing and access overview"
      className="border-b border-violet-100 bg-white"
    >
      <div className="mx-auto grid max-w-[1320px] gap-px bg-violet-100 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        {POINTS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex min-h-20 items-center gap-3 bg-white px-3 py-4"
          >
            <Icon size={18} className="shrink-0 text-violet-700" />
            <span className="text-xs font-semibold leading-5 text-slate-600">
              {text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

