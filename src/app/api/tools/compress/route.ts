// src/app/api/tools/compress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

import { isSameSiteStateChangingRequest } from '@/lib/api-security'

export const runtime = 'nodejs'
export const maxDuration = 60

type CompressionLevel = 'low' | 'medium' | 'high'

const PROCESSING_API_BASE = process.env.PDFMANTRA_PROCESSING_API_BASE_URL
const SECRET_KEY = process.env.PDFMANTRA_SECRET_KEY
const MAX_FILE_SIZE = 50 * 1024 * 1024

function createJsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

async function compressViaBackend(
  fileBuffer: Buffer,
  level: CompressionLevel,
  filename: string
): Promise<Buffer> {
  const form = new FormData()
  form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename)
  form.append('level', level)

  const res = await fetch(`${PROCESSING_API_BASE}/compress`, {
    method: 'POST',
    headers: SECRET_KEY ? { Authorization: `Bearer ${SECRET_KEY}` } : {},
    body: form,
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Processing API ${res.status}: ${msg}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

async function compressViaPdfLib(
  fileBuffer: Buffer,
  level: CompressionLevel
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(fileBuffer)

  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setProducer('PDFMantra')
  pdfDoc.setCreator('PDFMantra')

  const objectsPerTick = level === 'high' ? 10 : level === 'medium' ? 30 : 75

  const bytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick,
  })

  return Buffer.from(bytes)
}

export async function POST(req: NextRequest) {
  if (!isSameSiteStateChangingRequest(req)) {
    return createJsonError('Request origin is not allowed.', 403)
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const level = ((formData.get('level') as string) || 'medium') as CompressionLevel

    if (!file) {
      return createJsonError('No file provided.', 400)
    }
    if (file.type !== 'application/pdf') {
      return createJsonError('Only PDF files are accepted.', 415)
    }
    if (!['low', 'medium', 'high'].includes(level)) {
      return createJsonError('Level must be low, medium, or high.', 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return createJsonError('File too large. Maximum 50 MB.', 413)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const originalSize = fileBuffer.length

    let compressedBuffer: Buffer
    let method: 'backend' | 'fallback'

    if (PROCESSING_API_BASE) {
      try {
        compressedBuffer = await compressViaBackend(fileBuffer, level, file.name)
        method = 'backend'
      } catch (err) {
        console.error('[compress] Backend failed, using fallback:', err)
        compressedBuffer = await compressViaPdfLib(fileBuffer, level)
        method = 'fallback'
      }
    } else {
      compressedBuffer = await compressViaPdfLib(fileBuffer, level)
      method = 'fallback'
    }

    const compressedSize = compressedBuffer.length
    const savedBytes = Math.max(0, originalSize - compressedSize)
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1)
    const outputName = file.name.replace(/\.pdf$/i, '_compressed.pdf')

    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(compressedSize),
        'X-Original-Size': String(originalSize),
        'X-Compressed-Size': String(compressedSize),
        'X-Saved-Bytes': String(savedBytes),
        'X-Saved-Percent': savedPercent,
        'X-Compression-Method': method,
        'X-Compression-Level': level,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[compress] Unhandled error:', err)
    return createJsonError('Compression failed. Please try a different file.', 500)
  }
}
