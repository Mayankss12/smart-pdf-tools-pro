import { Header } from "@/components/Header";
import { ReactNode } from "react";

export function ToolShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-slate-600">{description}</p>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </main>
    </>
  );
}
