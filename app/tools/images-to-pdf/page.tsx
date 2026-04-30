"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { downloadBlob, imagesToPdf } from "@/lib/pdf-utils";

export default function ImagesToPdfPage(){const [files,setFiles]=useState<File[]>([]);const [status,setStatus]=useState("Upload JPG/PNG/WebP images.");async function run(){if(!files.length) return setStatus("Please upload at least one image.");const b=await imagesToPdf(files);downloadBlob(b,"pdfmantra-images-to-pdf.pdf");setStatus("PDF downloaded.");}return <ToolShell title="Images to PDF" description="Convert images into a PDF document in your browser."><div className="space-y-4"><FileDropzone label="Upload images" accept="image/png,image/jpeg,image/webp" multiple onFiles={setFiles} /><ul className="list-disc pl-5 text-sm text-slate-600">{files.map((f)=><li key={f.name}>{f.name}</li>)}</ul><button onClick={run} className="btn-primary">Convert & Download</button><StatusCard status={status} /></div></ToolShell>}
