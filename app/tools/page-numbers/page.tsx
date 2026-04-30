"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { addPageNumbers, downloadBlob } from "@/lib/pdf-utils";

export default function PageNumbersPage(){const [file,setFile]=useState<File|null>(null);const [status,setStatus]=useState("Upload a PDF to add page numbers.");async function run(){if(!file) return setStatus("Please upload a PDF.");const b=await addPageNumbers(file);downloadBlob(b,"pdfmantra-page-numbers.pdf");setStatus("Numbered PDF downloaded.");}return <ToolShell title="Page Numbers" description="Add bottom-center page numbers to every page."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><button onClick={run} className="btn-primary">Add Numbers & Download</button><StatusCard status={status} /></div></ToolShell>}
