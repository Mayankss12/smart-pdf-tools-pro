// src/lib/pdf-compress.ts
//
// Real PDF compression via PDF.js canvas rendering.
// Each page is rendered to a canvas and re-encoded as JPEG.
// This reduces file size significantly for image-heavy PDFs.
//
// Trade-off: text becomes image (not selectable/searchable after compression).
// Best for catalogues, brochures, scanned documents.
//
// Requires: pdfjs-dist (already installed), pdf-lib (already installed)

import * as pdfjs from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

// PDF.js worker — must match installed pdfjs-dist version exactly
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export type CompressionLevel = 'low' | 'medium' | 'high'

// scale = canvas render resolution (lower = smaller file + less detail)
// quality = JPEG encoding quality 0–1 (lower = more compression + more artifacts)
const LEVEL_CONFIG: Record<CompressionLevel, { scale: number; quality: number }> = {
  low:    { scale: 1.5, quality: 0.92 },
  medium: { scale: 1.2, quality: 0.75 },
  high:   { scale: 1.0, quality: 0.50 },
}

export interface CanvasCompressResult {
  blob: Blob
  originalSize: number
  compressedSize: number
}

export async function canvasCompressPdf(
  file: File,
  level: CompressionLevel,
  onProgress: (percent: number) => void
): Promise<CanvasCompressResult> {
  const { scale, quality } = LEVEL_CONFIG[level]

  onProgress(5)

  // Read file bytes
  const arrayBuffer = await file.arrayBuffer()

  // Load PDF with PDF.js
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdfDocument = await loadingTask.promise
  const numPages    = pdfDocument.numPages

  onProgress(10)

  // Create new empty PDF with pdf-lib
  const newPdf = await PDFDocument.create()

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // Progress: 10% → 92% across all pages
    onProgress(Math.round(10 + ((pageNum - 1) / numPages) * 82))

    const page     = await pdfDocument.getPage(pageNum)
    const viewport = page.getViewport({ scale })

    // Create canvas
    const canvas  = document.createElement('canvas')
    canvas.width  = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable.')

    // JPEG has no transparency — fill white background first
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Render PDF page onto canvas
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise

    // Encode canvas as JPEG
    const dataUrl   = canvas.toDataURL('image/jpeg', quality)
    const base64    = dataUrl.split(',')[1]
    const jpegBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

    // Embed JPEG into new pdf-lib page at exact canvas dimensions
    const jpegImage = await newPdf.embedJpg(jpegBytes)
    const newPage   = newPdf.addPage([canvas.width, canvas.height])
    newPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width:  canvas.width,
      height: canvas.height,
    })
  }

  onProgress(95)

  // Serialise new PDF
  const compressedBytes = await newPdf.save()
  const blob = new Blob([compressedBytes], { type: 'application/pdf' })

  onProgress(100)

  return {
    blob,
    originalSize:   file.size,
    compressedSize: blob.size,
  }
}
