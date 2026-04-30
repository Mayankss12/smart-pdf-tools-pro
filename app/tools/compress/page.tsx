"use client";
import { useState } from "react";
import { Header } from "@/components/Header";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { downloadBlob, optimizePdf } from "@/lib/pdf-utils";

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Upload one PDF to optimize.");
  async function run() {
    if (!file) return setStatus("Please upload a PDF.");
    const b = await optimizePdf(file);
    downloadBlob(b, "pdfmantra-optimized.pdf");
    setStatus("Optimized PDF downloaded.");
  }
  return (<><Header /><main className="mx-auto max-w-4xl px-6 py-14"><h1 className="text-4xl font-black">Compress PDF</h1><p className="mt-3 text-slate-600">Browser-only compression is limited. This optimize tool rewrites the PDF and may reduce size for some files. Advanced compression will need backend later.</p><div className="mt-8 space-y-4 rounded-3xl border bg-white p-6"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><button onClick={run} className="btn-primary">Optimize & Download</button><StatusCard status={status} /></div></main></>);
}
