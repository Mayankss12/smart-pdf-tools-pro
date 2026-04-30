"use client";
import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob, splitPdfByGroups } from "@/lib/pdf-utils";
import { PdfPreview } from "@/components/PdfPreview";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [groupsInput, setGroupsInput] = useState("1-2,3-4");
  const [status, setStatus] = useState("Use comma to create separate split files. Example: 1-4,5-8 creates two PDFs.");
  async function run() {
    if (!file) return setStatus("Please upload one PDF.");
    try {
      const blobs = await splitPdfByGroups(file, groupsInput);
      blobs.forEach((b, i) => downloadBlob(b, `pdfmantra-split-${i + 1}.pdf`));
      setStatus(`Downloaded ${blobs.length} split file(s).`);
    } catch (e) { setStatus(e instanceof Error ? e.message : "Split failed."); }
  }
  return <ToolShell title="Split PDF" description="Create separate PDFs per comma-separated group."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><PdfPreview file={file} maxPages={6} /><input value={groupsInput} onChange={(e)=>setGroupsInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" /><button onClick={run} className="btn-primary">Split & Download</button><StatusCard status={status} /></div></ToolShell>;
}
