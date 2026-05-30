// src/lib/pdf-compress.ts
//
// Advanced PDF compression using PDF.js + pdf-lib.
// Two modes:
//   1. Level mode  — Low / Medium / High with quality-preserving settings
//   2. Target mode — binary searches JPEG quality to hit a file size target
//
// Renders each page to canvas as JPEG, then reassembles into a new PDF.
// Note: text becomes rasterised (not selectable) after compression.

import * as pdfjs from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export type CompressionLevel = 'low' | 'medium' | 'high'

// Revised quality floors — previous values were too aggressive.
// scale = render DPI multiplier  |  quality = JPEG quality 0–1
const LEVEL_CONFIG: Record<CompressionLevel, { scale: number; quality: number }> = {
  low:    { scale: 2.0, quality: 0.95 }, // near-lossless, subtle reduction
  medium: { scale: 1.5, quality: 0.85 }, // balanced — good quality, real reduction
  high:   { scale: 1.2, quality: 0.72 }, // compressed but still clean
}

const MIN_QUALITY = 0.35 // floor — below this JPEG looks broken
const MIN_SCALE   = 1.0  // floor scale used when target is very aggressive

export interface CanvasCompressResult {
  blob:          Blob
  originalSize:  number
  compressedSize: number
  qualityUsed:   number
  targetMet:     boolean
}

// ── Phase 1: Render all PDF pages to in-memory canvases ──────────
async function renderPages(
  pdfDoc:   pdfjs.PDFDocumentProxy,
  scale:    number,
  onProg:   (n: number) => void,
  pStart:   number,
  pEnd:     number
): Promise<HTMLCanvasElement[]> {
  const total   = pdfDoc.numPages
  const canvases: HTMLCanvasElement[] = []

  for (let i = 1; i <= total; i++) {
    onProg(Math.round(pStart + ((i - 1) / total) * (pEnd - pStart)))

    const page     = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas   = document.createElement('canvas')
    canvas.width   = Math.floor(viewport.width)
    canvas.height  = Math.floor(viewport.height)

    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff' // white bg — JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise

    canvases.push(canvas)
  }
  return canvases
}

// ── Phase 2: Encode canvases → JPEG bytes at a given quality ────
function encodeJpeg(canvases: HTMLCanvasElement[], quality: number): Uint8Array[] {
  return canvases.map((c) => {
    const b64 = c.toDataURL('image/jpeg', quality).split(',')[1]
    return Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
  })
}

// ── Phase 3: Assemble JPEG pages into a new PDF ──────────────────
async function buildPdf(
  pages:    Uint8Array[],
  canvases: HTMLCanvasElement[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages.length; i++) {
    const img  = await doc.embedJpg(pages[i])
    const page = doc.addPage([canvases[i].width, canvases[i].height])
    page.drawImage(img, { x: 0, y: 0, width: canvases[i].width, height: canvases[i].height })
  }
  return doc.save()
}

// ── Estimate PDF size from JPEG bytes (avoids full assembly) ─────
function estimateSize(pages: Uint8Array[]): number {
  return pages.reduce((s, p) => s + p.length, 0) + 65536 // +64 KB PDF overhead
}

// ── Binary search: find highest quality that fits target bytes ───
function binarySearchQuality(canvases: HTMLCanvasElement[], targetBytes: number): number {
  let lo = MIN_QUALITY, hi = 0.95, best = MIN_QUALITY

  for (let i = 0; i < 8; i++) {
    const mid  = (lo + hi) / 2
    const size = estimateSize(encodeJpeg(canvases, mid))

    if (size <= targetBytes) { best = mid; lo = mid }
    else                      { hi = mid }

    if (hi - lo < 0.008) break
  }
  return best
}

// ── Main export ──────────────────────────────────────────────────
export async function canvasCompressPdf(
  file:        File,
  level:       CompressionLevel,
  onProgress:  (n: number) => void,
  targetBytes: number | null = null
): Promise<CanvasCompressResult> {
  onProgress(5)

  const buf     = await file.arrayBuffer()
  const pdfDoc  = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise

  let blob:        Blob
  let qualityUsed: number
  let targetMet:   boolean

  if (targetBytes !== null) {
    // ── TARGET SIZE MODE ────────────────────────────────────────
    // Render at scale 1.5 first (good quality baseline)
    const canvases = await renderPages(pdfDoc, 1.5, onProgress, 8, 65)
    onProgress(65)

    // Check if max quality already fits
    const maxJpeg = encodeJpeg(canvases, 0.95)
    if (estimateSize(maxJpeg) <= targetBytes) {
      const bytes = await buildPdf(maxJpeg, canvases)
      qualityUsed = 0.95
      targetMet   = true
      blob        = new Blob([bytes], { type: 'application/pdf' })
    } else {
      // Binary search on scale 1.5 canvases
      onProgress(68)
      qualityUsed = binarySearchQuality(canvases, targetBytes)
      const jpeg  = encodeJpeg(canvases, qualityUsed)
      targetMet   = estimateSize(jpeg) <= targetBytes

      if (!targetMet) {
        // Scale 1.5 not enough — re-render at scale 1.0 (smaller pages)
        onProgress(72)
        const small = await renderPages(pdfDoc, MIN_SCALE, onProgress, 72, 88)
        qualityUsed = binarySearchQuality(small, targetBytes)
        const sJpeg = encodeJpeg(small, qualityUsed)
        targetMet   = estimateSize(sJpeg) <= targetBytes
        onProgress(90)
        const bytes = await buildPdf(sJpeg, small)
        blob        = new Blob([bytes], { type: 'application/pdf' })
      } else {
        onProgress(88)
        const bytes = await buildPdf(jpeg, canvases)
        blob        = new Blob([bytes], { type: 'application/pdf' })
      }
    }
  } else {
    // ── LEVEL MODE ──────────────────────────────────────────────
    const { scale, quality } = LEVEL_CONFIG[level]
    const canvases = await renderPages(pdfDoc, scale, onProgress, 8, 88)
    const jpeg     = encodeJpeg(canvases, quality)
    onProgress(90)
    const bytes = await buildPdf(jpeg, canvases)
    qualityUsed  = quality
    targetMet    = true
    blob         = new Blob([bytes], { type: 'application/pdf' })
  }

  onProgress(100)

  return {
    blob,
    originalSize:   file.size,
    compressedSize: blob.size,
    qualityUsed,
    targetMet,
  }
}
