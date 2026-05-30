// src/hooks/useCompress.ts
import { useState, useCallback } from 'react'
import { canvasCompressPdf, type CompressionLevel } from '@/lib/pdf-compress'

export type { CompressionLevel }

export interface CompressResult {
  blob:          Blob
  filename:      string
  originalSize:  number
  compressedSize: number
  savedBytes:    number
  savedPercent:  number
  method:        'canvas'
  level:         CompressionLevel
  targetMet:     boolean
  qualityUsed:   number
}

export function useCompress() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [result,    setResult]    = useState<CompressResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const compress = useCallback(async (
    file:        File,
    level:       CompressionLevel = 'medium',
    targetBytes: number | null    = null
  ): Promise<CompressResult | null> => {
    setIsLoading(true)
    setProgress(0)
    setResult(null)
    setError(null)

    try {
      const { blob, originalSize, compressedSize, qualityUsed, targetMet } =
        await canvasCompressPdf(file, level, setProgress, targetBytes)

      const savedBytes   = Math.max(0, originalSize - compressedSize)
      const savedPercent = Number(((savedBytes / originalSize) * 100).toFixed(1))
      const filename     = file.name.replace(/\.pdf$/i, '_compressed.pdf')

      const res: CompressResult = {
        blob, filename, originalSize, compressedSize,
        savedBytes, savedPercent,
        method: 'canvas', level, targetMet, qualityUsed,
      }

      setResult(res)
      return res
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compression failed.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const download = useCallback((r: CompressResult) => {
    const url = URL.createObjectURL(r.blob)
    const a   = Object.assign(document.createElement('a'), { href: url, download: r.filename })
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
