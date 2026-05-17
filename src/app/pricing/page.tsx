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

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-5xl">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                PDFMantra Pricing
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                Simple pricing now,
                <span className="brand-gradient-text block">premium processing later.</span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                Start with the free browser-side PDF experience. Premium backend tools such as OCR, compression, conversion, and bulk workflows will be priced once the processing architecture is finalized.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Plans</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Choose the PDF workflow that fits today.
              </h2>
            </div>

            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              Payment stays intentionally later. Limits, storage, backend processing costs, and account rules should be finalized first.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <div className="grid divide-y divide-[var(--border-light)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {plans.map((plan) => {
                const Icon = plan.icon;

                return (
                  <div
                    key={plan.name}
                    className={[
                      "relative flex min-h-full flex-col px-5 py-6 sm:px-6 lg:px-7 lg:py-7",
                      plan.featured
                        ? "bg-[var(--violet-50)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--violet-600)]"
                        : "bg-[var(--bg-card)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                        <Icon size={21} />
                      </div>

                      <span className={plan.featured ? "status-beta" : "status-soon"}>
                        {plan.badge}
                      </span>
                    </div>

                    <h3 className="display-font mt-6 text-[1.8rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      {plan.name}
                    </h3>

                    <div className="mt-2 text-[1.8rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                      {plan.price}
                    </div>

                    <p className="mt-3 min-h-[56px] text-sm font-normal leading-7 text-[var(--text-secondary)]">
                      {plan.description}
                    </p>

                    <Link href={plan.href} className={plan.featured ? "btn-primary mt-6" : "btn-secondary mt-6"}>
                      <span>{plan.cta}</span>
                      <ArrowRight size={16} />
                    </Link>

                    <div className="mt-6 space-y-3 border-t border-[var(--border-light)] pt-5">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-3 text-sm font-medium leading-6 text-[var(--text-secondary)]"
                        >
                          <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--violet-600)]" />
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

        <section className="border-t border-[var(--border-light)] bg-[var(--bg-panel)]/70">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <Lock size={20} />
                </div>
                <h3 className="display-font text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Payment will be added last
                </h3>
                <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Pricing should be connected only after backend costs, storage, OCR, compression, and conversion limits are finalized.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <Zap size={20} />
                </div>
                <h3 className="display-font text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Free editor remains demo-ready
                </h3>
                <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
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
