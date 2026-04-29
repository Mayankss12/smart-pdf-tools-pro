import { Header } from "@/components/Header";

export default function ToolPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="text-4xl font-black">Split</h1>
        <p className="mt-3 text-slate-600">Upload workflow placeholder. Full processing can be connected next.</p>
        <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="font-bold">Upload files</div>
          <p className="mt-2 text-sm text-slate-500">Drag and drop area for this tool.</p>
        </div>
      </main>
    </>
  );
}
