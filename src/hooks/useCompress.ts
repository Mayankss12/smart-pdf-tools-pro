// src/hooks/useCompress.ts
import { useState, useCallback } from 'react'
import { optimizePdfStructure } from '@/lib/pdf-engine'

export type CompressionLevel = 'low' | 'medium' | 'high'

export interface CompressResult {
  blob: Blob
  filename: string
  originalSize: number
  compressedSize: number
  savedBytes: number
  savedPercent: number
  method: 'backend' | 'fallback' | 'browser'
  level: CompressionLevel
}

// Vercel hard limit for API route bodies is 4.5 MB.
// Files above 4 MB are processed browser-side instead.
const API_SIZE_LIMIT = 4 * 1024 * 1024

export function useCompress() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState<CompressResult | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const compress = useCallback(
    async (file: File, level: CompressionLevel = 'medium'): Promise<CompressResult | null> => {
      setIsLoading(true)
      setProgress(0)
      setResult(null)
      setError(null)

      try {
        let res: CompressResult | null = null

        if (file.size > API_SIZE_LIMIT) {
          // Large file — browser-side only (no Vercel body limit applies)
          res = await compressBrowser(file, level, setProgress)
        } else {
          // Small file — try API first, fall back to browser if it fails
          res = await compressApi(file, level, setProgress)
          if (!res) {
            res = await compressBrowser(file, level, setProgress)
          }
        }

        setProgress(100)
        setResult(res)
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Compression failed.'
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const download = useCallback((r: CompressResult) => {
    const url = URL.createObjectURL(r.blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = r.filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setProgress(0)
    setResult(null)
    setError(null)
  }, [])

  return { compress, download, reset, isLoading, progress, result, error }
}

// ── Browser-side (pdf-lib structural optimisation, no size limit) ──
async function compressBrowser(
  file: File,
  level: CompressionLevel,
  setProgress: (n: number) => void
): Promise<CompressResult> {
  setProgress(20)
  const optimized = await optimizePdfStructure(file)
  setProgress(90)

  const originalSize   = optimized.originalSize
  const compressedSize = optimized.outputSize
  const savedBytes     = Math.max(0, originalSize - compressedSize)
  const savedPercent   = Number(optimized.reductionPercent)
  const filename       = optimized.fileName

  return { blob: optimized.blob, filename, originalSize, compressedSize, savedBytes, savedPercent, method: 'browser', level }
}

// ── API route (files ≤ 4 MB, tries backend then pdf-lib server-side) ──
async function compressApi(
  file: File,
  level: CompressionLevel,
  setProgress: (n: number) => void
): Promise<CompressResult | null> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('level', level)

    setProgress(20)
    const res = await fetch('/api/tools/compress', { method: 'POST', body: form })
    setProgress(75)

    if (!res.ok) return null

    const blob        = await res.blob()
    const originalSize   = Number(res.headers.get('X-Original-Size')   ?? file.size)
    const compressedSize = Number(res.headers.get('X-Compressed-Size') ?? blob.size)
    const savedBytes     = Number(res.headers.get('X-Saved-Bytes')     ?? 0)
    const savedPercent   = Number(res.headers.get('X-Saved-Percent')   ?? 0)
    const method         = (res.headers.get('X-Compression-Method') ?? 'fallback') as 'backend' | 'fallback'
    const disposition    = res.headers.get('Content-Disposition') ?? ''
    const nameMatch      = disposition.match(/filename="?([^"]+)"?/)
    const filename       = nameMatch?.[1] ?? file.name.replace(/\.pdf$/i, '_compressed.pdf')

    return { blob, filename, originalSize, compressedSize, savedBytes, savedPercent, method, level }
  } catch {
    return null
  }
}
