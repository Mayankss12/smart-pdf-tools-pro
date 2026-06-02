import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import { tools } from "@/lib/tools";
import { ArrowRight, BadgeCheck, MoveUpRight } from "lucide-react";

const heroCategories = [
  "All",
  "Tools",
  "Organize PDF",
  "Optimize PDF",
  "Convert PDF",
  "Edit PDF",
  "PDF Security",
] as const;

function toneForCategory(category: string): ToolGlyphTone {
  if (category === "organize" || category === "optimize") return "indigo";
  if (category === "convert") return "mint";
  return "violet";
}

const homeTools = tools.filter((tool) => tool.status === "working");

const premiumBenefits = [
  "Sharper document tools across editing, organizing, and conversion",
  "Focused PDF actions designed to feel cleaner from upload to export",
  "A premium interface that keeps power tools easy to discover",
] as const;

function ToolCard({ tool }: { readonly tool: (typeof homeTools)[number] }) {
  return (
    <Link
      href={tool.href}
      className="group mx-auto grid min-h-[160px] w-full max-w-[172px] justify-items-center rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-4 text-center shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)] sm:min-h-[154px]"
    >
      <ToolGlyph icon={tool.icon} tone={toneForCategory(tool.category)} size="sm" />

      <h3 className="display-font mt-2 text-center text-[1.02rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
        {tool.title}
      </h3>

      <p className="mx-auto mt-2 max-w-[150px] text-center text-[12.25px] font-normal leading-5 text-[var(--text-secondary)]">
        {tool.menuDescription || tool.description}
      </p>
    </Link>
  );
}

function DesktopVisual() {
  return (
    <div className="relative h-[180px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5 sm:h-[212px]">
      <div className="h-full rounded-t-[1.2rem] border border-[var(--violet-border)] bg-white shadow-[0_18px_42px_rgba(101,80,232,0.10)]">
        <div className="flex h-8 items-center gap-2 border-b border-[var(--border-light)] px-4">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <div className="grid h-[172px] grid-cols-[72px_1fr]">
          <div className="border-r border-[var(--border-light)] bg-[var(--violet-50)] p-3">
            <div className="space-y-3">
              <div className="h-3 rounded bg-[var(--violet-100)]" />
              <div className="h-3 rounded bg-[var(--violet-100)]" />
              <div className="h-3 rounded bg-[var(--violet-600)]/18" />
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto h-full max-w-[190px] rounded-xl border border-[var(--border-light)] bg-white p-4 shadow-[var(--shadow-soft)]">
              <div className="h-3 w-4/5 rounded bg-[var(--violet-100)]" />
              <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-11/12 rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-4/5 rounded bg-slate-100" />
              <div className="mt-5 h-8 rounded-lg bg-[var(--violet-50)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileVisual() {
  return (
    <div className="relative h-[180px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5 sm:h-[212px]">
      <div className="mx-auto h-[196px] w-[118px] rounded-[1.7rem] border-[6px] border-white bg-white shadow-[0_18px_42px_rgba(101,80,232,0.12)]">
        <div className="h-full overflow-hidden rounded-[1.28rem] border border-[var(--border-light)] bg-[var(--bg-card)]">
          <div className="flex h-7 items-center justify-center border-b border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
            9:41
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-2">
              <div className="h-2.5 w-4/5 rounded bg-[var(--violet-600)]/20" />
              <div className="mt-2 h-2 w-full rounded bg-white/90" />
            </div>
            <div className="rounded-xl border border-[var(--border-light)] bg-white p-2">
              <div className="h-2.5 w-3/4 rounded bg-slate-100" />
              <div className="mt-2 h-2 w-full rounded bg-slate-100" />
            </div>
            <div className="h-8 rounded-xl bg-[var(--violet-600)]/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessVisual() {
  return (
    <div className="relative h-[180px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5 sm:h-[212px]">
      <div className="absolute left-7 top-7 h-36 w-32 rounded-[1.2rem] border border-[var(--border-light)] bg-white p-4 shadow-[0_16px_38px_rgba(101,80,232,0.10)]">
        <div className="h-3 w-3/5 rounded bg-[var(--violet-100)]" />
        <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
        <div className="mt-2 h-2.5 w-5/6 rounded bg-slate-100" />
        <div className="mt-7 h-8 rounded-lg bg-[var(--violet-50)]" />
      </div>
      <div className="absolute bottom-6 right-6 h-28 w-36 rounded-[1.15rem] bg-[#282a36] p-4 text-white shadow-[0_18px_42px_rgba(24,21,46,0.18)]">
        <div className="text-[10px] font-semibold text-white/60">workflow.ts</div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-4/5 rounded bg-white/18" />
          <div className="h-2 w-full rounded bg-white/18" />
          <div className="h-2 w-3/5 rounded bg-white/18" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main
        className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <section className="hero-aurora overflow-hidden border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="mx-auto max-w-6xl text-center">
              <h1 className="display-font mx-auto mt-5 max-w-4xl text-[clamp(1.75rem,5vw,2.95rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)]">
                Every PDF task,
                <span className="brand-gradient-text block">one clear workspace.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-7">
                Merge, edit, convert, organize, and secure PDFs through faster, cleaner tools.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {heroCategories.map((item, index) => (
                  <Link
                    key={item}
                    href="/tools"
                    className={[
                      "inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-[13px] font-semibold transition duration-200 sm:text-sm",
                      index === 0
                        ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)]"
                        : "border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
                    ].join(" ")}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-10 grid max-w-[1320px] grid-cols-2 place-items-center justify-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {homeTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-[1480px]">
            <div className="text-center">
              <p className="section-eyebrow justify-center">Work your way</p>
              <h2 className="display-font mt-3 text-[2.15rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.8rem]">
                More ways to keep PDF work moving.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <DesktopVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Work with focused tools
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    Open a task-specific PDF tool, upload your file, and finish the job without wandering through a busy dashboard.
                  </p>
                  <Link href="/tools" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    Browse tools
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <MobileVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Move faster on smaller screens
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    The interface stays readable and action-first, so users can find tools quickly even when working away from a desk.
                  </p>
                  <Link href="/features" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    View features
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <BusinessVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Built for serious document work
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    From file cleanup to secure sharing, PDFMantra keeps advanced workflows visually calm and easier to trust.
                  </p>
                  <Link href="/security" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    Explore security
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[2rem] border border-[var(--border-light)] bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-[0_28px_90px_rgba(101,80,232,0.10)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-12">
              <div className="flex flex-col justify-center">
                <p className="section-eyebrow">PDFMantra Premium</p>
                <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.14] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.65rem]">
                  Get more from every PDF tool.
                </h2>
                <div className="mt-6 space-y-3.5">
                  {premiumBenefits.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-primary)] sm:text-[15px]">
                      <BadgeCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/pricing" className="btn-primary">
                    <span>View Pricing</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/features" className="btn-secondary bg-white/90">
                    <span>See Features</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="relative min-h-[320px] rounded-[1.8rem] border border-white/80 bg-white/68 p-5 shadow-[0_22px_60px_rgba(101,80,232,0.12)] backdrop-blur sm:min-h-[360px]">
                <div className="absolute right-5 top-5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Premium workspace
                </div>
                <div className="absolute left-8 top-10 hidden h-60 w-48 rotate-[-3deg] rounded-[1.2rem] border border-[var(--border-light)] bg-white p-5 shadow-[0_18px_42px_rgba(101,80,232,0.12)] sm:block">
                  <div className="h-3 w-3/5 rounded bg-rose-300" />
                  <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-2.5 w-11/12 rounded bg-slate-100" />
                  <div className="mt-2 h-2.5 w-4/5 rounded bg-slate-100" />
                  <div className="mt-8 h-24 rounded-xl bg-[var(--violet-50)]" />
                </div>
                <div className="absolute bottom-8 right-8 hidden h-48 w-60 rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--bg-panel)] p-5 shadow-[0_20px_48px_rgba(101,80,232,0.14)] sm:block">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-[var(--violet-600)]/90" />
                    <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[var(--violet-600)]">Aa</div>
                  </div>
                  <div className="mt-5 h-3 w-4/5 rounded bg-white" />
                  <div className="mt-3 h-3 w-full rounded bg-white/85" />
                  <div className="mt-3 h-3 w-3/5 rounded bg-white/75" />
                  <div className="mt-5 h-10 rounded-xl bg-white/92" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
