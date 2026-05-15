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
    description: "For basic browser-side PDF editing and testing.",
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
    description: "For users who need OCR, conversion, and higher limits.",
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
];

export default function PricingPage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                  <Sparkles size={14} />
                  PDFMantra Pricing
                </div>

                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.4rem]">
                  Simple pricing structure for free tools now and premium tools later.
                </h1>

                <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-50/95 sm:text-lg">
                  Start with the free browser-side PDF editor. Premium backend
                  tools like OCR, compression, conversion, and bulk processing
                  can be added after the product workflow is finalized.
                </p>
              </div>
            </section>

            <section className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Plans</div>
                  <h2 className="mt-2 section-title">Choose your PDF workflow</h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  Payment is intentionally planned for the final phase after
                  backend features, limits, and processing costs are finalized.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {plans.map((plan) => {
                  const Icon = plan.icon;

                  return (
                    <div
                      key={plan.name}
                      className={`rounded-[1.75rem] border bg-white p-6 shadow-sm ${
                        plan.featured
                          ? "border-indigo-300 ring-4 ring-indigo-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                          <Icon size={22} />
                        </div>

                        <span
                          className={
                            plan.featured ? "status-live" : "status-soon"
                          }
                        >
                          {plan.badge}
                        </span>
                      </div>

                      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                        {plan.name}
                      </h3>

                      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {plan.price}
                      </div>

                      <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
                        {plan.description}
                      </p>

                      <Link
                        href={plan.href}
                        className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                          plan.featured
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
                            : "border border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight size={16} />
                      </Link>

                      <div className="mt-6 space-y-3">
                        {plan.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700"
                          >
                            <BadgeCheck
                              size={17}
                              className="mt-0.5 text-emerald-600"
                            />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-t border-slate-100 bg-slate-50 px-6 py-10 sm:px-10 lg:px-14">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="premium-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <Lock size={20} />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Payment will be added last
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
                    Payment should be added only after backend costs, limits,
                    storage, OCR, compression, and conversion workflows are final.
                  </p>
                </div>

                <div className="premium-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Free editor is demo-ready
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
                    The current browser-side editor is enough to demonstrate
                    PDFMantra’s direction before backend setup.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
