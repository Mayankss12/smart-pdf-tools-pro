"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Download, GripHorizontal, Image as ImageIcon, Type } from "lucide-react";
import { downloadBlob, readFileAsArrayBuffer } from "@/lib/pdf-utils";

type SignatureMode = "text" | "image";
type TextStyle = "clean" | "bold" | "italic";
type SigRect = { x: number; y: number; width: number; height: number };

export default function FillSignPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Upload a PDF to start signing.");
  const [numPages, setNumPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);

  const [mode, setMode] = useState<SignatureMode>("text");
  const [signerName, setSignerName] = useState("Signer Name");
  const [textStyle, setTextStyle] = useState<TextStyle>("clean");
  const [fontSize, setFontSize] = useState(28);

  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [signatureImageUrl, setSignatureImageUrl] = useState("");

  const [sigRect, setSigRect] = useState<SigRect>({ x: 60, y: 60, width: 240, height: 64 });
  const [isSelected, setIsSelected] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    return () => {
      if (signatureImageUrl) URL.revokeObjectURL(signatureImageUrl);
    };
  }, [signatureImageUrl]);

  useEffect(() => {
    async function renderPdfPreviews() {
      if (!file) {
        setPageImages([]);
        setNumPages(0);
        setActivePage(0);
        return;
      }

      try {
        setStatus("Rendering PDF preview...");
        const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const images: string[] = [];

        for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
          const page = await doc.getPage(pageNo);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          images.push(canvas.toDataURL("image/png"));
        }

        setPageImages(images);
        setNumPages(doc.numPages);
        setActivePage(0);
        setStatus("Drag and resize your signature, then export.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to render PDF preview.");
      }
    }

    renderPdfPreviews();
  }, [file]);

  const activePageSrc = pageImages[activePage] ?? "";

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = { ...sigRect };

    const move = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const nextX = Math.max(0, Math.min(startRect.x + dx, bounds.width - startRect.width));
      const nextY = Math.max(0, Math.min(startRect.y + dy, bounds.height - startRect.height));
      setSigRect((prev) => ({ ...prev, x: nextX, y: nextY }));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>, handle: "nw" | "ne" | "sw" | "se") => {
    if (!containerRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = { ...sigRect };

    const move = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let next = { ...startRect };
      if (handle.includes("e")) next.width = Math.max(80, startRect.width + dx);
      if (handle.includes("s")) next.height = Math.max(36, startRect.height + dy);
      if (handle.includes("w")) {
        next.x = Math.max(0, startRect.x + dx);
        next.width = Math.max(80, startRect.width - dx);
      }
      if (handle.includes("n")) {
        next.y = Math.max(0, startRect.y + dy);
        next.height = Math.max(36, startRect.height - dy);
      }

      next.width = Math.min(next.width, bounds.width - next.x);
      next.height = Math.min(next.height, bounds.height - next.y);
      setSigRect(next);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  async function exportSignedPdf() {
    if (!file) {
      setStatus("Please upload a PDF.");
      return;
    }

    if (mode === "image" && !signatureImage) {
      setStatus("Please upload a signature image.");
      return;
    }

    if (!containerRef.current) {
      setStatus("Preview is not ready yet.");
      return;
    }

    try {
      const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
      const pages = pdf.getPages();
      const page = pages[activePage];
      if (!page) throw new Error("Selected page is not available.");

      const { width: pdfWidth, height: pdfHeight } = page.getSize();
      const previewBounds = containerRef.current.getBoundingClientRect();
      const scaleX = pdfWidth / previewBounds.width;
      const scaleY = pdfHeight / previewBounds.height;

      const drawX = sigRect.x * scaleX;
      const drawY = pdfHeight - (sigRect.y + sigRect.height) * scaleY;
      const drawW = sigRect.width * scaleX;
      const drawH = sigRect.height * scaleY;

      if (mode === "text") {
        const font =
          textStyle === "bold"
            ? await pdf.embedFont(StandardFonts.HelveticaBold)
            : textStyle === "italic"
              ? await pdf.embedFont(StandardFonts.HelveticaOblique)
              : await pdf.embedFont(StandardFonts.Helvetica);

        const scaledFontSize = Math.max(10, fontSize * scaleY * 0.9);
        page.drawText(signerName || "Signer Name", {
          x: drawX + 6,
          y: drawY + Math.max(4, drawH * 0.25),
          size: scaledFontSize,
          font,
          color: rgb(0.13, 0.18, 0.36),
        });
      } else if (signatureImage) {
        const imageBytes = new Uint8Array(await signatureImage.arrayBuffer());
        const embedded =
          signatureImage.type.includes("png")
            ? await pdf.embedPng(imageBytes)
            : await pdf.embedJpg(imageBytes);
        page.drawImage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });
      }

      const bytes = await pdf.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "PDFMantra-signed.pdf");
      setStatus(`Signed PDF exported on page ${activePage + 1}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    }
  }

  const signaturePreview = useMemo(() => {
    if (mode === "image" && signatureImageUrl) {
      return <img src={signatureImageUrl} alt="Signature preview" className="h-full w-full object-contain" />;
    }
    return (
      <span
        className={`block truncate px-2 ${
          textStyle === "bold" ? "font-bold" : textStyle === "italic" ? "italic" : "font-medium"
        }`}
        style={{ fontSize: `${Math.max(14, fontSize)}px` }}
      >
        {signerName || "Signer Name"}
      </span>
    );
  }, [fontSize, mode, signatureImageUrl, signerName, textStyle]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          PDFMantra Tool
        </span>
        <h1 className="text-3xl font-bold text-slate-900">Fill &amp; Sign PDF</h1>
        <p className="text-sm text-slate-600">Upload, place, and export your signature with precise drag-and-resize controls.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="rounded-2xl border bg-white p-3">
          <p className="mb-3 text-sm font-semibold text-slate-700">Pages</p>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mb-3 block w-full text-xs"
          />
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {pageImages.map((src, index) => (
              <button
                key={src}
                className={`w-full rounded-lg border p-1 text-left ${
                  activePage === index ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"
                }`}
                onClick={() => setActivePage(index)}
              >
                <img src={src} alt={`Page ${index + 1}`} className="w-full rounded" />
                <p className="px-1 pt-1 text-xs text-slate-600">Page {index + 1}</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="rounded-2xl border bg-slate-50 p-4">
          <div
            ref={containerRef}
            className="relative mx-auto min-h-[520px] w-full max-w-3xl overflow-hidden rounded-xl border bg-white"
            onClick={() => setIsSelected(true)}
          >
            {activePageSrc ? (
              <img src={activePageSrc} alt={`Active page ${activePage + 1}`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-[520px] items-center justify-center text-slate-400">Upload a PDF to preview pages.</div>
            )}

            {activePageSrc && (
              <div
                className={`absolute bg-white/85 shadow-sm ${isSelected ? "border border-indigo-500" : "border border-slate-300"}`}
                style={{ left: sigRect.x, top: sigRect.y, width: sigRect.width, height: sigRect.height }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div
                  className="flex h-6 cursor-move items-center gap-1 border-b bg-indigo-50 px-2 text-xs text-indigo-700"
                  onPointerDown={startDrag}
                >
                  <GripHorizontal className="h-3 w-3" /> Drag
                </div>
                <div className="flex h-[calc(100%-24px)] items-center justify-center overflow-hidden">{signaturePreview}</div>

                {(["nw", "ne", "sw", "se"] as const).map((handle) => {
                  const pos: Record<typeof handle, string> = {
                    nw: "-left-1 -top-1 cursor-nwse-resize",
                    ne: "-right-1 -top-1 cursor-nesw-resize",
                    sw: "-bottom-1 -left-1 cursor-nesw-resize",
                    se: "-bottom-1 -right-1 cursor-nwse-resize",
                  };
                  return (
                    <div
                      key={handle}
                      className={`absolute h-3 w-3 rounded-full border border-indigo-500 bg-white ${pos[handle]}`}
                      onPointerDown={(event) => startResize(event, handle)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="space-y-4 rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              className={`rounded-lg px-3 py-2 text-sm ${mode === "text" ? "bg-white font-semibold text-indigo-700" : "text-slate-600"}`}
              onClick={() => setMode("text")}
            >
              <Type className="mr-1 inline h-4 w-4" /> Text
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm ${mode === "image" ? "bg-white font-semibold text-indigo-700" : "text-slate-600"}`}
              onClick={() => setMode("image")}
            >
              <ImageIcon className="mr-1 inline h-4 w-4" /> Image
            </button>
          </div>

          {mode === "text" ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Signer name</label>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
              <label className="block text-sm font-medium text-slate-700">Style</label>
              <select
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value as TextStyle)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="clean">Clean</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
              </select>
              <label className="block text-sm font-medium text-slate-700">Font size</label>
              <input
                type="number"
                min={12}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value) || 28)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Upload signature image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setSignatureImage(selected);
                  if (signatureImageUrl) URL.revokeObjectURL(signatureImageUrl);
                  setSignatureImageUrl(selected ? URL.createObjectURL(selected) : "");
                }}
                className="w-full text-sm"
              />
              {signatureImageUrl && <img src={signatureImageUrl} alt="Uploaded signature" className="max-h-32 rounded border" />}
              <label className="block text-sm font-medium text-slate-700">Image size</label>
              <input
                type="range"
                min={120}
                max={520}
                value={sigRect.width}
                onChange={(e) =>
                  setSigRect((prev) => ({
                    ...prev,
                    width: Number(e.target.value),
                    height: Math.max(40, Number(e.target.value) * 0.35),
                  }))
                }
                className="w-full"
              />
            </div>
          )}

          <div className="grid gap-2">
            <button
              className="rounded-lg border px-3 py-2 text-sm text-slate-700"
              onClick={() => setSigRect({ x: 60, y: 60, width: 240, height: 64 })}
            >
              Reset position
            </button>
            <button className="btn-primary inline-flex items-center justify-center gap-2" onClick={exportSignedPdf}>
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>

          <p className="text-xs text-slate-500">Saved signature library will be added later for logged-in subscription users.</p>
          <p className="text-xs text-slate-500">Active page: {numPages ? `${activePage + 1} of ${numPages}` : "No PDF selected"}</p>
          <p className="text-xs text-slate-600">{status}</p>
        </aside>
      </div>
    </div>
  );
}
