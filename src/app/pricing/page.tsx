import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Crown,
  Lock,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    description: "For browser-side PDF editing and testing.",
    icon: User,
    badge: "Current",
    cta: "Start Free",
    href: "/editor",
    featured: false,
    features: [
      "Upload and preview PDFs",
      "Add text, images, and signatures",
      "Highlight selectable PDF text",
      "Export edited PDF",
      "Browser-side processing",
    ],
  },
  {
    name: "Pro",
    price: "Coming soon",
    description: "For OCR, conversion, and higher processing limits.",
    icon: Crown,
    badge: "Planned",
    cta: "Use Free Editor",
    href: "/editor",
    featured: true,
    features: [
      "Scanned PDF OCR",
      "PDF to Word conversion",
      "High-quality compression",
      "Saved signatures",
      "Higher usage limits",
      "Priority processing",
    ],
  },
  {
    name: "Business",
    price: "Custom",
    description: "For teams and professional document workflows.",
    icon: Building2,
    badge: "Later",
    cta: "View Tools",
    href: "/tools",
    featured: false,
    features: [
      "Team workspace",
      "Bulk processing",
      "Advanced file handling",
      "Admin controls",
      "Business support",
      "Custom limits",
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf8ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/60 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/55 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={13} />
                PDFMantra Pricing
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.45rem]">
                Simple pricing now,
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                  premium processing later.
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                Start with the free browser-side PDF experience. Premium backend tools such as OCR, compression, conversion, and bulk workflows will be priced once the processing architecture is finalized.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                Plans
              </p>
              <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                Choose the PDF workflow that fits today.
              </h2>
            </div>

            <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-[15px] lg:justify-self-end">
              Payment stays intentionally later. Limits, storage, backend processing costs, and account rules should be finalized first.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-violet-100 bg-white/78 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <div className="grid divide-y divide-violet-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {plans.map((plan) => {
                const Icon = plan.icon;

                return (
                  <div
                    key={plan.name}
                    className={[
                      "relative flex min-h-full flex-col px-5 py-6 sm:px-6 lg:px-7 lg:py-7",
                      plan.featured ? "bg-gradient-to-b from-violet-50/85 via-white to-rose-50/50" : "bg-white/72",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-violet-100 bg-white text-violet-700 shadow-sm">
                        <Icon size={21} />
                      </div>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                          plan.featured ? "bg-rose-50 text-rose-500" : "bg-violet-50 text-violet-700",
                        ].join(" ")}
                      >
                        {plan.badge}
                      </span>
                    </div>

                    <h3 className="display-font mt-6 text-[1.8rem] font-medium tracking-[-0.04em] text-slate-950">
                      {plan.name}
                    </h3>

                    <div className="mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
                      {plan.price}
                    </div>

                    <p className="mt-3 min-h-[56px] text-sm font-medium leading-7 text-slate-600">
                      {plan.description}
                    </p>

                    <Link
                      href={plan.href}
                      className={[
                        "mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition duration-200",
                        plan.featured
                          ? "bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 text-white shadow-[0_18px_42px_rgba(91,63,193,0.22)] hover:-translate-y-0.5"
                          : "border border-violet-100 bg-white text-violet-700 hover:border-violet-200 hover:bg-violet-50",
                      ].join(" ")}
                    >
                      {plan.cta}
                      <ArrowRight size={16} />
                    </Link>

                    <div className="mt-6 space-y-3 border-t border-violet-100 pt-5">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700"
                        >
                          <BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-violet-100 bg-white/76">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/82 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-rose-100 bg-rose-50 text-rose-600">
                  <Lock size={20} />
                </div>
                <h3 className="display-font text-[1.65rem] font-medium tracking-[-0.035em] text-slate-950">
                  Payment will be added last
                </h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  Pricing should be connected only after backend costs, storage, OCR, compression, and conversion limits are finalized.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50/85 via-white to-rose-50/65 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-violet-100 bg-white text-violet-700">
                  <Zap size={20} />
                </div>
                <h3 className="display-font text-[1.65rem] font-medium tracking-[-0.035em] text-slate-950">
                  Free editor remains demo-ready
                </h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  The current browser-side editor is enough to show PDFMantra’s direction while premium processing is prepared properly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
