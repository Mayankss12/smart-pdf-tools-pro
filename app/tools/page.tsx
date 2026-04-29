import Link from "next/link";
import { Header } from "@/components/Header";
import { tools } from "@/lib/tools";

export default function ToolsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="text-4xl font-black">PDF Tools</h1>
        <p className="mt-3 text-slate-600">Choose a tool to work with your PDF files.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link href={tool.href} key={tool.name} className="tool-card">
                <Icon className="mb-4 text-brand-600" />
                <h2 className="text-lg font-bold">{tool.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{tool.desc}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
