import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  FolderOpen,
  KeyRound,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PersonalDetailsForm } from "@/components/account/PersonalDetailsForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Account — PDFMantra",
  description: "Manage your PDFMantra personal details and account settings.",
};

export const dynamic = "force-dynamic";

type AccountPageProps = {
  readonly searchParams: Promise<{ tab?: string }>;
};

function SettingLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  readonly href: string;
  readonly icon: typeof KeyRound;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <ArrowRight size={17} className="shrink-0 text-slate-300 transition group-hover:text-violet-600" />
    </Link>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?next=/account");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,tier,created_at")
    .eq("id", user.id)
    .maybeSingle();
  const params = await searchParams;
  const activeTab = params.tab === "settings" ? "settings" : "personal";
  const fullName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    user.email?.split("@")[0] ||
    "PDFMantra user";
  const phone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : "";
  const tier = typeof profile?.tier === "string" ? profile.tier : "free";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                PDFMantra account
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                My Account
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Manage your personal details, security, workspace and plan.
              </p>
            </div>
            <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-violet-700">
              {tier} plan
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            <nav
              aria-label="Account sections"
              className="h-fit rounded-3xl border border-slate-200 bg-white p-2 shadow-sm"
            >
              <Link
                href="/account"
                aria-current={activeTab === "personal" ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                  activeTab === "personal"
                    ? "bg-violet-600 text-white"
                    : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                }`}
              >
                <UserRound size={18} /> Personal details
              </Link>
              <Link
                href="/account?tab=settings"
                aria-current={activeTab === "settings" ? "page" : undefined}
                className={`mt-1 flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                  activeTab === "settings"
                    ? "bg-violet-600 text-white"
                    : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                }`}
              >
                <Settings size={18} /> Settings
              </Link>
            </nav>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              {activeTab === "personal" ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-black">Personal details</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Keep the contact information attached to your account current.
                    </p>
                  </div>
                  <PersonalDetailsForm
                    fullName={fullName}
                    email={user.email ?? ""}
                    phone={phone}
                  />
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-black">Account settings</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Manage access, documents, plan and support from one place.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SettingLink
                      href="/forgot-password"
                      icon={KeyRound}
                      title="Change password"
                      description="Send a secure password-reset link to your email."
                    />
                    <SettingLink
                      href="/dashboard"
                      icon={FolderOpen}
                      title="Document workspace"
                      description="Open saved documents and version history."
                    />
                    <SettingLink
                      href="/pricing"
                      icon={CreditCard}
                      title="Subscription details"
                      description="Review your current plan and available upgrades."
                    />
                    <SettingLink
                      href="/privacy"
                      icon={ShieldCheck}
                      title="Privacy & security"
                      description="Review how PDFMantra handles account and document data."
                    />
                  </div>
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">Current session</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Signed in as {user.email}
                        </p>
                      </div>
                      <form action="/logout" method="post">
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
