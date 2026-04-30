"use client";
import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusCard } from "@/components/StatusCard";
import { downloadBlob, imagesToPdf } from "@/lib/pdf-utils";
import { ImagePreviewGrid } from "@/components/ImagePreviewGrid";
import { SortableFileList } from "@/components/SortableFileList";

export default function ImagesToPdfPage(){const [files,setFiles]=useState<File[]>([]);const [status,setStatus]=useState("Upload images, reorder, then convert.");async function run(){if(!files.length) return setStatus("Please upload at least one image.");const b=await imagesToPdf(files);downloadBlob(b,"pdfmantra-images-to-pdf.pdf");setStatus("PDF downloaded.");}return <ToolShell title="Images to PDF" description="Preview and reorder images before conversion."><div className="space-y-4"><FileDropzone label="Upload images" accept="image/png,image/jpeg,image/webp" multiple onFiles={setFiles} /><SortableFileList files={files} setFiles={setFiles} /><ImagePreviewGrid files={files} /><button onClick={run} className="btn-primary">Convert & Download</button><StatusCard status={status} /></div></ToolShell>}
