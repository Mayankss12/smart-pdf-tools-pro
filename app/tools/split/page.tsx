"use client";
import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob, splitPdfByPages } from "@/lib/pdf-utils";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageInput, setPageInput] = useState("1-2");
  const [status, setStatus] = useState("Upload one PDF and enter page range.");
  async function run() {
    if (!file) return setStatus("Please upload one PDF.");
    try { const blob = await splitPdfByPages(file, pageInput); downloadBlob(blob, "pdfmantra-split.pdf"); setStatus("Split PDF downloaded."); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Split failed."); }
  }
  return <ToolShell title="Split PDF" description="Extract selected pages (e.g. 1-3,5)."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><input value={pageInput} onChange={(e)=>setPageInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" /><button onClick={run} className="btn-primary">Split & Download</button><StatusCard status={status} /></div></ToolShell>;
}
