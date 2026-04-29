import { Header } from "@/components/Header";

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="text-4xl font-black">Dashboard</h1>
        <p className="mt-3 text-slate-600">Login and recent files can be connected later with Supabase.</p>
      </main>
    </>
  );
}
