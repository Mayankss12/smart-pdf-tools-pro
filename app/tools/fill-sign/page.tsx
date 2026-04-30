"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadBlob, readFileAsArrayBuffer } from "@/lib/pdf-utils";

export default function FillSignPage(){const [file,setFile]=useState<File|null>(null);const [name,setName]=useState("");const [status,setStatus]=useState("Upload a PDF and enter signer name.");async function run(){if(!file) return setStatus("Please upload a PDF.");const pdf=await PDFDocument.load(await readFileAsArrayBuffer(file));const font=await pdf.embedFont(StandardFonts.HelveticaOblique);const page=pdf.getPages()[0];if(page){const {width}=page.getSize();page.drawText(`Signed by: ${name || "Signer"}`,{x:Math.max(20,width-220),y:26,size:14,font,color:rgb(0.12,0.2,0.5)});}downloadBlob(new Blob([await pdf.save()],{type:"application/pdf"}),"pdfmantra-signed.pdf");setStatus("Signed PDF downloaded.");}return <ToolShell title="Fill & Sign" description="Basic signer text placement foundation."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Signer full name" className="w-full rounded-xl border px-3 py-2" /><p className="text-sm text-slate-500">Freehand signature drawing will be added later.</p><button onClick={run} className="btn-primary">Sign & Download</button><StatusCard status={status} /></div></ToolShell>}
