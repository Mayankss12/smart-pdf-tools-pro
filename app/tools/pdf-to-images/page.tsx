"use client";
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { downloadBlob } from "@/lib/pdf-utils";

export default function PdfToImagesPage(){const [file,setFile]=useState<File|null>(null);const [status,setStatus]=useState("Upload one PDF to convert pages to PNG images.");useEffect(()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=`https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;},[]);async function run(){if(!file) return setStatus("Please upload a PDF.");setStatus("Rendering pages...");const data=await file.arrayBuffer();const doc=await pdfjsLib.getDocument({data}).promise;for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const viewport=page.getViewport({scale:2});const canvas=document.createElement("canvas");const ctx=canvas.getContext("2d");if(!ctx) continue;canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:ctx,viewport}).promise;const blob:Blob=await new Promise((resolve,reject)=>canvas.toBlob((b)=>b?resolve(b):reject(new Error("PNG conversion failed")),"image/png"));downloadBlob(blob,`pdfmantra-page-${i}.png`);}setStatus(`Downloaded ${doc.numPages} PNG file(s).`);}return <ToolShell title="PDF to Images" description="Convert PDF pages to PNG images in your browser."><div className="space-y-4"><FileDropzone label="Upload one PDF" accept="application/pdf,.pdf" onFiles={(f)=>setFile(f[0]||null)} /><button onClick={run} className="btn-primary">Convert & Download PNGs</button><StatusCard status={status} /></div></ToolShell>}
