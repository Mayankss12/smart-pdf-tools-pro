"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileText,
  IndianRupee,
  Layers,
  Lock,
  MoveUpRight,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const showcaseTools = [
  {
    title: "Reorder PDF Pages",
    description: "Move pages visually and export a clean reordered PDF.",
    href: "/tools/reorder",
    label: "Page workspace",
    icon: Layers,
  },
  {
    title: "Fill & Sign Documents",
    description: "Add text, dates, marks, signatures, whiteout, and images.",
    href: "/tools/fill-sign",
    label: "Signature editor",
    icon: FileText,
  },
  {
    title: "OCR + Searchable PDFs",
    description: "Prepared for searchable scanned document workflows.",
    href: "/tools/ocr",
    label: "Roadmap workflow",
    icon: Search,
  },
] as const;

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
    description: "Start fast with essential PDF tools.",
    features: ["5 exports/day", "Browser-side tools", "No signup required", "Core PDF actions"],
    href: "/tools",
    cta: "Start free",
    featured: false,
  },
  {
    name: "Plus",
    price: "₹99",
    suffix: "/mo",
    description: "For users who work with PDFs regularly.",
    features: ["Unlimited exports", "Higher file limits", "No PDFMantra mark", "Priority browser tools"],
    href: "/pricing",
    cta: "Start trial",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹249",
    suffix: "/mo",
    description: "For power users and serious workflows.",
    features: ["Everything in Plus", "Advanced editor roadmap", "OCR workflows roadmap", "Saved signatures planned"],
    href: "/pricing",
    cta: "Start trial",
    featured: true,
  },
] as const;

function ShowcaseCard({ tool }: { readonly tool: (typeof showcaseTools)[number] }) {
  const Icon = tool.icon;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-[var(--border-light)] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[var(--border-focus)] hover:shadow-[0_28px_90px_rgba(101,80,232,0.15)]">
      <div className="relative h-64 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(124,92,255,0.24),transparent_34%),linear-gradient(135deg,#f5f3ff_0%,#eef2ff_52%,#ffffff_100%)] p-5">
        <div className="absolute right-5 top-5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--violet-600)] shadow-sm backdrop-blur">
          {tool.label}
        </div>

        <div className="flex h-full items-end">
          <div className="w-full rounded-[1.35rem] border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_rgba(101,80,232,0.18)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border-light)] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <div className="h-2 w-20 rounded-full bg-[var(--violet-100)]" />
            </div>

            <div className="grid grid-cols-[56px_1fr] gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
                <Icon size={24} />
              </div>

              <div className="space-y-2">
                <div className="h-3 w-4/5 rounded-full bg-[var(--violet-100)]" />
                <div className="h-2.5 w-full rounded-full bg-slate-100" />
                <div className="h-2.5 w-10/12 rounded-full bg-slate-100" />
                <div className="mt-4 h-8 w-32 rounded-xl bg-[var(--violet-600)]/90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="display-font text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
          {tool.title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {tool.description}
        </p>

        <Link
          href={tool.href}
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
        >
          Try it
          <MoveUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}

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
          <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
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

  function handleHeroDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    router.push("/editor");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora flex min-h-[80vh] items-center overflow-hidden border-b border-[var(--border-light)]">
          <div className="mx-auto grid w-full max-w-[1500px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white/80 px-4 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm backdrop-blur">
                <BadgeCheck size={16} className="text-[var(--violet-600)]" />
                No signups · No ads · Browser-first
              </div>

              <h1 className="display-font mt-7 max-w-4xl text-5xl font-bold leading-[0.96] tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Every PDF task,
                <span className="brand-gradient-text block">one clean workspace.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                PDFMantra brings editing, signing, organizing, conversion, and compression into a calm workspace built for fast everyday document work.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/tools"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--violet-600)] px-6 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(101,80,232,0.24)] transition hover:bg-[var(--violet-500)]"
                >
                  Browse all tools
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex h-13 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-white px-6 py-4 text-sm font-bold text-[var(--violet-600)] shadow-sm transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
                >
                  View pricing
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--text-secondary)]">
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

            <button
              type="button"
              onClick={() => router.push("/editor")}
              onDrop={handleHeroDrop}
              onDragOver={(event) => event.preventDefault()}
              className="group relative flex min-h-[480px] w-full items-center justify-center overflow-hidden rounded-[2.5rem] border-2 border-dashed border-[var(--border-focus)] bg-white/80 p-8 text-center shadow-[0_30px_100px_rgba(101,80,232,0.14)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_40px_130px_rgba(101,80,232,0.20)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,92,255,0.20),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.14),transparent_30%)]" />

              <div className="relative z-10 mx-auto max-w-sm">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[var(--violet-600)] text-white shadow-[0_18px_45px_rgba(101,80,232,0.30)] transition group-hover:scale-105">
                  <Upload size={34} />
                </div>

                <h2 className="display-font mt-7 text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  Drop any PDF here
                </h2>

                <p className="mt-3 text-sm font-medium leading-7 text-[var(--text-secondary)]">
                  We&apos;ll open the editor so you can start working immediately.
                </p>

                <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--violet-50)] px-4 py-2 text-sm font-bold text-[var(--violet-600)]">
                  Open workspace
                  <ArrowRight size={16} />
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="section-eyebrow justify-center">Why PDFMantra</p>

            <h2 className="display-font mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
              Built in India.
              <span className="block">Priced for India.</span>
              <span className="brand-gradient-text block">Adobe-level polish.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              Professional PDF work should not feel expensive or complicated. PDFMantra is designed for Indian users who want premium document tools at practical pricing.
            </p>

            <div className="mx-auto mt-12 grid max-w-4xl overflow-hidden rounded-[2rem] border border-[var(--border-light)] bg-white text-left shadow-[0_26px_90px_rgba(15,23,42,0.08)] md:grid-cols-2">
              <div className="border-b border-[var(--border-light)] p-6 md:border-b-0 md:border-r">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Adobe Acrobat
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="display-font text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    $19.99
                  </span>
                  <span className="pb-1 text-sm font-semibold text-[var(--text-secondary)]">
                    /month
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
                  Around ₹1,670/month before taxes and currency variation.
                </p>
              </div>

              <div className="relative bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_100%)] p-6">
                <div className="absolute right-5 top-5 rounded-full bg-[var(--violet-600)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                  6x cheaper
                </div>

                <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--violet-600)]">
                  PDFMantra Pro
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="display-font text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    ₹249
                  </span>
                  <span className="pb-1 text-sm font-semibold text-[var(--text-secondary)]">
                    /month
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
                  Premium PDF workflows, Indian pricing, and browser-first speed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-eyebrow">See it in action</p>
                <h2 className="display-font mt-4 text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
                  Three workflows that show the product.
                </h2>
              </div>

              <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                Screenshot placeholders are ready now. Replace them later with real screenshots from your tools.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {showcaseTools.map((tool) => (
                <ShowcaseCard key={tool.title} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
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

        <section className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-20 sm:px-6 lg:px-8">
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

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
                <PricingCard key={plan.name} plan={plan} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
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