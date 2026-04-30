"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { addPageNumbers, downloadBlob } from "@/lib/pdf-utils";
import { PdfPreview } from "@/components/PdfPreview";

export default function PageNumbersPage(){const [file,setFile]=useState<File|null>(null);const [status,setStatus]=useState("Upload a PDF to add page numbers.");const [position,setPosition]=useState<"center"|"right">("center");async function run(){if(!file) return setStatus("Please upload a PDF.");const b=await addPageNumbers(file, position);downloadBlob(b,`pdfmantra-page-numbers-${position}.pdf`);setStatus("Numbered PDF downloaded.");}return <ToolShell title="Page Numbers" description="Add page numbers with preview."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><PdfPreview file={file} maxPages={4} /><select value={position} onChange={(e)=>setPosition(e.target.value as "center"|"right")} className="rounded-xl border px-3 py-2"><option value="center">Bottom center</option><option value="right">Bottom right</option></select><button onClick={run} className="btn-primary">Add Numbers & Download</button><StatusCard status={status} /></div></ToolShell>}
