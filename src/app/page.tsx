"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  FileText,
  IndianRupee,
  Lock,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const trustSignals = [
  "11 focused tools",
  "Browser-first",
  "Zero upload for browser tools",
  "OCR roadmap",
  "Free forever tier",
] as const;

const pricingPlans = [
  {
    name: "Free",
    price: "₹0",
    suffix: "forever",
    description: "For quick daily PDF work.",
    features: ["5 exports/day", "All browser tools", "No signup required", "Core PDF actions"],
    href: "/tools",
    cta: "Start free",
    featured: false,
  },
  {
    name: "Plus",
    price: "₹99",
    suffix: "/mo",
    description: "For regular PDF users.",
    features: ["Unlimited exports", "No PDFMantra mark", "Higher file limits", "Priority browser tools"],
    href: "/pricing",
    cta: "Start trial",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹249",
    suffix: "/mo",
    description: "For power users and teams.",
    features: ["Everything in Plus", "OCR workflows roadmap", "Advanced editor roadmap", "Saved signatures planned"],
    href: "/pricing",
    cta: "Start trial",
    featured: true,
  },
] as const;

function PricingCard({ plan }: { readonly plan: (typeof pricingPlans)[number] }) {
  return (
    <article
      className={[
        "relative rounded-[2rem] border bg-white p-6 shadow-[0_22px_75px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1",
        plan.featured
          ? "border-[var(--violet-600)] ring-4 ring-[rgba(101,80,232,0.10)]"
          : "border-[var(--border-light)]",
      ].join(" ")}
    >
      {plan.featured ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--violet-600)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_14px_35px_rgba(101,80,232,0.24)]">
          Popular
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="display-font text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {plan.name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {plan.description}
          </p>
        </div>

        {plan.featured ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
            <Sparkles size={20} />
          </div>
        ) : null}
      </div>

      <div className="mt-7 flex items-end gap-1">
        <span className="display-font text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
          {plan.price}
        </span>
        <span className="pb-1 text-sm font-semibold text-[var(--text-secondary)]">
          {plan.suffix}
        </span>
      </div>

      <ul className="mt-7 space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-secondary)]"
          >
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--violet-50)] text-[var(--violet-600)]">
              <Check size={13} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={[
          "mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold transition",
          plan.featured
            ? "bg-[var(--violet-600)] text-white shadow-[0_16px_35px_rgba(101,80,232,0.22)] hover:bg-[var(--violet-500)]"
            : "border border-[var(--border-light)] bg-white text-[var(--violet-600)] hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]",
        ].join(" ")}
      >
        {plan.cta}
      </Link>
    </article>
  );
}

export default function HomePage() {
  const router = useRouter();

  function openWorkspace() {
    router.push("/editor");
  }

  function handleHeroDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    router.push("/editor");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora overflow-hidden border-b border-[var(--border-light)]">
          <div className="mx-auto grid w-full max-w-[1500px] items-center gap-6 px-4 py-10 sm:px-6 sm:py-16 lg:min-h-[80vh] lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm backdrop-blur">
                <BadgeCheck size={16} className="text-[var(--violet-600)]" />
                No signups · No ads · Browser-first
              </div>

              <h1 className="display-font mt-6 max-w-4xl text-5xl font-bold leading-[0.96] tracking-tight text-[var(--text-primary)] sm:mt-7 sm:text-6xl lg:text-7xl">
                Every PDF task,
                <span className="brand-gradient-text block">one clean workspace.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:mt-7 sm:text-lg">
                PDFMantra brings editing, signing, organizing, conversion, and compression into a calm workspace built for fast everyday document work.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--text-secondary)] sm:mt-8">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--violet-600)]" />
                  Browser-side tools
                </span>
                <span className="inline-flex items-center gap-2">
                  <Lock size={16} className="text-[var(--violet-600)]" />
                  Privacy-first workflow
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={openWorkspace}
                onDrop={handleHeroDrop}
                onDragOver={(event) => event.preventDefault()}
                className="group relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-[var(--border-focus)] bg-white/85 p-6 text-center shadow-[0_26px_80px_rgba(101,80,232,0.14)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_36px_110px_rgba(101,80,232,0.20)] sm:h-[420px] lg:h-[480px]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,92,255,0.18),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.12),transparent_30%)]" />

                <div className="relative z-10 mx-auto max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[var(--violet-600)] text-white shadow-[0_18px_45px_rgba(101,80,232,0.30)] transition group-hover:scale-105 sm:h-20 sm:w-20 sm:rounded-[2rem]">
                    <Upload size={30} />
                  </div>

                  <h2 className="display-font mt-5 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:mt-7 sm:text-3xl">
                    Drop any PDF here
                  </h2>

                  <p className="mt-3 text-sm font-medium leading-7 text-[var(--text-secondary)]">
                    Open the workspace and start editing immediately.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--violet-50)] px-4 py-2 text-sm font-bold text-[var(--violet-600)] sm:mt-7">
                    Open workspace
                    <ArrowRight size={16} />
                  </div>
                </div>
              </button>

              <div className="mt-4 flex justify-center">
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
                >
                  Browse all tools
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-light)] bg-white/70 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <span>Discover why PDFMantra is different</span>
              <ArrowDown size={14} className="text-[var(--violet-600)]" />
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="section-eyebrow justify-center">Why PDFMantra</p>

            <h2 className="display-font mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
              Built in India.
              <span className="block">Priced for India.</span>
              <span className="brand-gradient-text block">Premium PDF quality.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              Professional PDF work should not feel expensive or complicated. PDFMantra is designed for Indian users who want clean, fast, and practical document tools.
            </p>

            <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-[var(--border-light)] bg-slate-50 px-5 py-4 text-sm font-bold text-[var(--text-secondary)] sm:mt-10">
              <IndianRupee size={18} className="text-[var(--violet-600)]" />
              Premium tools, fair local pricing.
            </div>
          </div>
        </section>

        {/* TODO: Add real screenshots here later.
            Showcase section is intentionally hidden until real screenshots are available.
            Planned screenshots:
            /public/screenshots/reorder-tool.png
            /public/screenshots/fill-sign.png
            /public/screenshots/ocr-tool.png
        */}

        <section className="border-t border-slate-100 bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-[1.5rem] border border-[var(--border-light)] bg-white px-5 py-5 text-center text-sm font-bold text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
              {trustSignals.map((signal, index) => (
                <div key={signal} className="flex items-center gap-4">
                  <span>{signal}</span>
                  {index < trustSignals.length - 1 ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet-200)]" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="section-eyebrow justify-center">Pricing</p>

              <h2 className="display-font mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
                Simple pricing, no surprises.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                Start free, upgrade when your PDF work becomes frequent, and keep pricing easy to understand.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3 sm:mt-12">
              {pricingPlans.map((plan) => (
                <PricingCard key={plan.name} plan={plan} />
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--border-light)] bg-white/80 px-5 py-4 text-center text-sm font-semibold leading-7 text-[var(--text-secondary)] shadow-sm backdrop-blur">
              Compare this with Adobe Acrobat at{" "}
              <span className="font-bold text-[var(--text-primary)]">$19.99/month</span>{" "}
              — around{" "}
              <span className="font-bold text-[var(--text-primary)]">₹1,670/month</span>{" "}
              before taxes and currency variation.
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--violet-600)] px-6 text-sm font-bold text-white shadow-[0_18px_40px_rgba(101,80,232,0.24)] transition hover:bg-[var(--violet-500)]"
              >
                Compare all features
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}