"use client";
import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob, mergePdfs } from "@/lib/pdf-utils";
import { SortableFileList } from "@/components/SortableFileList";

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("Upload PDFs, reorder them, then merge.");
  async function run() {
    if (files.length < 2) return setStatus("Please select at least 2 PDFs.");
    setStatus("Merging in selected order...");
    const blob = await mergePdfs(files);
    downloadBlob(blob, "pdfmantra-merged.pdf");
    setStatus("Merged PDF downloaded.");
  }
  return <ToolShell title="Merge PDF" description="Preview and reorder PDFs before merging."><div className="space-y-4"><FileDropzone label="Upload multiple PDFs" accept="application/pdf,.pdf" multiple onFiles={setFiles} /><SortableFileList files={files} setFiles={setFiles} /><button onClick={run} className="btn-primary">Merge & Download</button><StatusCard status={status} /></div></ToolShell>;
}
