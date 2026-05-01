"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type PdfTask = {
  id: string;
  tool_name: string;
  input_file_name: string | null;
  status: string;
  created_at: string;
};

function DashboardHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-xl font-black text-white">
            PDF
          </div>
          <div>
            <div className="text-xl font-black text-slate-950">PDFMantra</div>
            <div className="text-sm font-semibold text-slate-500">
              Smart PDF Workspace
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-bold text-slate-700">
          <Link href="/#tools" className="hover:text-blue-600">
            Tools
          </Link>
          <Link href="/pricing" className="hover:text-blue-600">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-blue-600">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PdfTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseMissing, setSupabaseMissing] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        setSupabaseMissing(true);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserEmail(user.email || null);

      const { data: taskData, error } = await supabase
        .from("pdf_tasks")
        .select("id, tool_name, input_file_name, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error) {
        setTasks(taskData || []);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    window.location.href = "/";
  }

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="text-4xl font-black text-slate-950">Dashboard</h1>
          <p className="mt-3 text-slate-600">Loading your account...</p>
        </main>
      </>
    );
  }

  if (supabaseMissing) {
    return (
      <>
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="text-4xl font-black text-slate-950">Dashboard</h1>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-900">
              Supabase is not connected
            </h2>
            <p className="mt-3 text-amber-800">
              Add these environment variables in Vercel, then redeploy:
            </p>

            <div className="mt-4 rounded-xl bg-white p-4 font-mono text-sm text-slate-800">
              <p>NEXT_PUBLIC_SUPABASE_URL</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!userEmail) {
    return (
      <>
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="text-4xl font-black text-slate-950">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Sign in to save your PDF history, usage, and account details.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow hover:bg-blue-700"
          >
            Login / Create Account
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-950">Dashboard</h1>
            <p className="mt-3 text-slate-600">Signed in as {userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Plan</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Free</h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Recent Tasks</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {tasks.length}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Workspace</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              PDFMantra
            </h2>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Recent PDF Tasks
          </h2>

          {tasks.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No PDF tasks saved yet. Process a PDF while signed in to see your
              history here.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4">Tool</th>
                    <th className="py-3 pr-4">File</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-semibold">
                        {task.tool_name}
                      </td>
                      <td className="py-3 pr-4">
                        {task.input_file_name || "-"}
                      </td>
                      <td className="py-3 pr-4">{task.status}</td>
                      <td className="py-3 pr-4">
                        {new Date(task.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
