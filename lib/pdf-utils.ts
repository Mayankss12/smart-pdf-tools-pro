import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await readFileAsArrayBuffer(file));
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return new Blob([await out.save()], { type: "application/pdf" });
}

function parsePageInput(pageInput: string, maxPages: number): number[] {
  const clean = pageInput.replace(/\s+/g, "");
  if (!clean) throw new Error("Enter at least one page or range.");
  const set = new Set<number>();
  for (const part of clean.split(",")) {
    if (!part) continue;
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) throw new Error(`Invalid range: ${part}`);
      for (let p = a; p <= b; p++) {
        if (p > maxPages) throw new Error(`Page ${p} exceeds PDF page count (${maxPages}).`);
        set.add(p - 1);
      }
    } else {
      const p = Number(part);
      if (!Number.isInteger(p) || p < 1 || p > maxPages) throw new Error(`Invalid page: ${part}`);
      set.add(p - 1);
    }
  }
  return Array.from(set).sort((x, y) => x - y);
}

export async function splitPdfByPages(file: File, pageInput: string): Promise<Blob> {
  const src = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const indices = parsePageInput(pageInput, src.getPageCount());
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return new Blob([await out.save()], { type: "application/pdf" });
}
export async function splitPdfByGroups(file: File, groupsInput: string): Promise<Blob[]> {
  const src = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const groups = groupsInput.split(",").map((g) => g.trim()).filter(Boolean);
  if (!groups.length) throw new Error("Enter at least one page range.");
  const out: Blob[] = [];
  for (const group of groups) {
    const outPdf = await PDFDocument.create();
    const indices = parsePageInput(group, src.getPageCount());
    const pages = await outPdf.copyPages(src, indices);
    pages.forEach((p) => outPdf.addPage(p));
    out.push(new Blob([await outPdf.save()], { type: "application/pdf" }));
  }
  return out;
}

export async function rotatePdf(file: File, deg: 90 | 180 | 270): Promise<Blob> {
  const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
  pdf.getPages().forEach((p) => p.setRotation(degrees(deg)));
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
export async function rotatePdfByPage(file: File, perPageRotations: number[]): Promise<Blob> {
  const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
  pdf.getPages().forEach((p, i) => p.setRotation(degrees(perPageRotations[i] || 0)));
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
    const isPng = file.type.includes("png");
    const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const { width, height } = image.scale(1);
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export async function addWatermark(file: File, watermarkText: string): Promise<Blob> {
  const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const size = Math.max(24, Math.min(width, height) / 9);
    const textWidth = font.widthOfTextAtSize(watermarkText, size);
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.35, 0.2, 0.7),
      rotate: degrees(-35),
      opacity: 0.18,
    });
  });
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export async function addPageNumbers(file: File, position: "center" | "right" = "center"): Promise<Blob> {
  const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const total = pdf.getPageCount();
  pdf.getPages().forEach((page, i) => {
    const { width } = page.getSize();
    const text = `${i + 1} / ${total}`;
    const size = 11;
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = position === "right" ? width - textWidth - 24 : (width - textWidth) / 2;
    page.drawText(text, { x, y: 20, size, font, color: rgb(0.2, 0.2, 0.25) });
  });
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export async function optimizePdf(file: File): Promise<Blob> {
  const pdf = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const saved = await pdf.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  return new Blob([saved], { type: "application/pdf" });
}
