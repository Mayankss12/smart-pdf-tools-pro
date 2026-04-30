"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { downloadBlob, rotatePdf } from "@/lib/pdf-utils";

export default function RotatePage(){const [file,setFile]=useState<File|null>(null);const [deg,setDeg]=useState<90|180|270>(90);const [status,setStatus]=useState("Upload a PDF to rotate.");async function run(){if(!file) return setStatus("Please upload a PDF.");const b=await rotatePdf(file,deg);downloadBlob(b,`pdfmantra-rotated-${deg}.pdf`);setStatus("Rotated PDF downloaded.");}return <ToolShell title="Rotate PDF" description="Rotate every page by 90, 180, or 270 degrees."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><select value={deg} onChange={(e)=>setDeg(Number(e.target.value) as 90|180|270)} className="rounded-xl border px-3 py-2"><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option></select><button onClick={run} className="btn-primary">Rotate & Download</button><StatusCard status={status} /></div></ToolShell>}
