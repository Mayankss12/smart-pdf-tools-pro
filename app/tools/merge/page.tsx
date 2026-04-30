"use client";
import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob, mergePdfs } from "@/lib/pdf-utils";

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("Upload PDFs to merge.");
  async function run() {
    if (files.length < 2) return setStatus("Please select at least 2 PDFs.");
    setStatus("Merging PDFs...");
    const blob = await mergePdfs(files);
    downloadBlob(blob, "pdfmantra-merged.pdf");
    setStatus("Merged PDF downloaded.");
  }
  return <ToolShell title="Merge PDF" description="Combine multiple PDF files in your browser."><div className="space-y-4"><FileDropzone label="Upload multiple PDFs" accept="application/pdf,.pdf" multiple onFiles={setFiles} /><ul className="list-disc pl-5 text-sm text-slate-600">{files.map((f) => <li key={f.name}>{f.name}</li>)}</ul><button onClick={run} className="btn-primary">Merge & Download</button><StatusCard status={status} /></div></ToolShell>;
}
