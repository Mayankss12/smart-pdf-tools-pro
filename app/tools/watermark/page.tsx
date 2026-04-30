"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { addWatermark, downloadBlob } from "@/lib/pdf-utils";
import { PdfPreview } from "@/components/PdfPreview";

export default function WatermarkPage(){const [file,setFile]=useState<File|null>(null);const [text,setText]=useState("PDFMantra");const [status,setStatus]=useState("Upload a PDF and set watermark text.");async function run(){if(!file) return setStatus("Please upload a PDF.");const b=await addWatermark(file,text||"PDFMantra");downloadBlob(b,"pdfmantra-watermarked.pdf");setStatus("Watermarked PDF downloaded.");}return <ToolShell title="Watermark PDF" description="Preview and add diagonal watermark to all pages."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><PdfPreview file={file} maxPages={4} /><input value={text} onChange={(e)=>setText(e.target.value)} className="w-full rounded-xl border px-3 py-2" /><button onClick={run} className="btn-primary">Watermark & Download</button><StatusCard status={status} /></div></ToolShell>}
