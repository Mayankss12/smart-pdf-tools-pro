import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  FileText,
  FolderOpen,
  LogOut,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const dashboardItems = [
  {
    title: "Saved documents",
    description: "Your uploaded and processed PDF documents will appear here.",
    icon: FolderOpen,
  },
  {
    title: "Annotation projects",
    description: "Reopen PDF annotations and continue editing later.",
    icon: PenLine,
  },
  {
    title: "Saved signatures",
    description: "Reusable signatures and initials will be connected to Sign PDF.",
    icon: BadgeCheck,
  },
  {
    title: "Processing jobs",
    description: "OCR, compression, and conversion jobs will be tracked here later.",
    icon: Clock,
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?next=/dashboard");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name
      : user.email ?? "PDFMantra User";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div className="max-w-5xl">
                <div className="eyebrow-chip">
                  <Sparkles size={13} />
                  PDFMantra Account
                </div>

                <h1 className="display-font mt-5 max-w-5xl text-[2.35rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.05rem] lg:text-[3.55rem]">
                  Welcome back,
                  <span className="brand-gradient-text block">{displayName}</span>
                </h1>

                <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                  Your account session is now connected. This dashboard is ready for saved documents, annotation projects, signatures, usage tracking, and backend-assisted processing.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/tools/annotate-pdf" className="btn-primary">
                    <span>Open Annotate PDF</span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link href="/tools" className="btn-secondary">
                    <span>Browse Tools</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <aside className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <UserRound size={22} />
                </div>
                <div className="mt-4 text-sm font-semibold text-[var(--text-muted)]">Signed in as</div>
                <div className="mt-1 break-words text-base font-bold text-[var(--text-primary)]">{user.email}</div>
                <Link
                  href="/logout"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  <LogOut size={16} />
                  Logout
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Backend ready</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Account workspace foundation
              </h2>
            </div>

            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              Auth is now active. Next we can connect real saved annotation projects, saved signatures, document history, and processing jobs one module at a time.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="min-h-[210px] rounded-[1.45rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                    <Icon size={21} />
                  </div>

                  <h3 className="display-font text-[1.2rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-[var(--border-light)] bg-[var(--bg-panel)]/72">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <BadgeCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Auth active
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Supabase Auth is connected for account sessions and protected dashboard access.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Storage ready
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Private buckets and RLS policies are ready for documents, outputs, and signature assets.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <FileText size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Save modules next
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  The next practical feature is saving and reopening Annotate PDF projects.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
