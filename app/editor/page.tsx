"use client";

import { Header } from "@/components/Header";
import { Upload, Type, Image, Highlighter, PenLine, Signature, ScanText, RotateCw, Trash2, Download } from "lucide-react";
import { useRef, useState } from "react";

const actions = [
  ["text", "Text", Type],
  ["image", "Image", Image],
  ["highlight", "Highlight", Highlighter],
  ["draw", "Draw", PenLine],
  ["sign", "Sign", Signature],
  ["ocr", "OCR", ScanText],
  ["rotate", "Rotate", RotateCw],
  ["delete", "Delete", Trash2],
  ["export", "Export", Download]
] as const;

export default function EditorPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [layers, setLayers] = useState<string[]>([]);
  const [status, setStatus] = useState("Upload a PDF to start.");

  function handleFile(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setStatus("Please upload a PDF file.");
      return;
    }
    setFileName(file.name);
    setStatus("PDF loaded. Choose a tool from the toolbar.");
  }

  function action(id: string) {
    if (!fileName && id !== "export") {
      setStatus("Upload PDF first.");
      return;
    }
    if (id === "export") {
      setStatus("Export foundation is ready. Full pdf-lib export comes in next version.");
      return;
    }
    setLayers((prev) => [...prev, id]);
    setStatus(`${id.toUpperCase()} layer added.`);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-black">Advanced PDF Editor</h1>
            <p className="mt-2 text-slate-600">{status}</p>
          </div>
          <button onClick={() => inputRef.current?.click()} className="btn-primary gap-2">
            <Upload size={18} /> Upload PDF
          </button>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>

        <div
          className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="font-bold">{fileName || "Drop PDF here"}</div>
          <div className="mt-1 text-sm text-slate-500">Upload, edit layers, and export.</div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b p-3">
            {actions.map(([id, label, Icon]) => (
              <button key={id} onClick={() => action(id)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="grid min-h-[560px] md:grid-cols-[160px_1fr_240px]">
            <aside className="border-r bg-slate-50 p-4">
              <div className="mb-3 font-bold">Pages</div>
              {[1,2,3].map((page) => <div key={page} className="mb-3 rounded-xl border bg-white p-3 text-sm">Page {page}</div>)}
            </aside>
            <section className="flex items-center justify-center bg-slate-200 p-6">
              <div className="relative min-h-[460px] w-full max-w-2xl rounded-xl bg-white p-10 shadow-lg">
                <div className="h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-5 h-3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
                {layers.map((layer, index) => (
                  <div key={index} className="absolute rounded-lg border border-brand-600 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700" style={{ left: 40, top: 110 + index * 38 }}>
                    {layer} layer
                  </div>
                ))}
              </div>
            </section>
            <aside className="border-l p-4">
              <div className="font-bold">Layers</div>
              <div className="mt-3 space-y-2">
                {layers.length === 0 ? <p className="text-sm text-slate-500">No layers yet.</p> : layers.map((l, i) => <div key={i} className="rounded-xl border p-3 text-sm capitalize">{l}</div>)}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
