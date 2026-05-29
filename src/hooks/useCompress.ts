// src/hooks/useCompress.ts
import { useState, useCallback } from 'react'

export type CompressionLevel = 'low' | 'medium' | 'high'

export interface CompressResult {
  blob: Blob
  filename: string
  originalSize: number
  compressedSize: number
  savedBytes: number
  savedPercent: number
  method: 'backend' | 'fallback'
  level: CompressionLevel
}

export interface CompressState {
  isLoading: boolean
  progress: number
  result: CompressResult | null
  error: string | null
}

export function useCompress() {
  const [state, setState] = useState<CompressState>({
    isLoading: false,
    progress: 0,
    result: null,
    error: null,
  })

  const compress = useCallback(
    async (file: File, level: CompressionLevel = 'medium'): Promise<CompressResult | null> => {
      setState({ isLoading: true, progress: 0, result: null, error: null })

      try {
        setState(s => ({ ...s, progress: 10 }))

        const form = new FormData()
        form.append('file', file)
        form.append('level', level)

        setState(s => ({ ...s, progress: 30 }))

        const res = await fetch('/api/tools/compress', {
          method: 'POST',
          body: form,
        })

        setState(s => ({ ...s, progress: 80 }))

        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          throw new Error(errorData?.error ?? `Server error ${res.status}. Please try again.`)
        }

        const blob = await res.blob()

        const originalSize   = Number(res.headers.get('X-Original-Size')   ?? file.size)
        const compressedSize = Number(res.headers.get('X-Compressed-Size') ?? blob.size)
        const savedBytes     = Number(res.headers.get('X-Saved-Bytes')     ?? 0)
        const savedPercent   = Number(res.headers.get('X-Saved-Percent')   ?? 0)
        const method         = (res.headers.get('X-Compression-Method') ?? 'fallback') as 'backend' | 'fallback'

        const disposition = res.headers.get('Content-Disposition') ?? ''
        const nameMatch   = disposition.match(/filename="?([^"]+)"?/)
        const filename    = nameMatch?.[1] ?? file.name.replace(/\.pdf$/i, '_compressed.pdf')

        const result: CompressResult = {
          blob,
          filename,
          originalSize,
          compressedSize,
          savedBytes,
          savedPercent,
          method,
          level,
        }

        setState({ isLoading: false, progress: 100, result, error: null })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
        setState({ isLoading: false, progress: 0, result: null, error: message })
        return null
      }
    },
    []
  )

  const download = useCallback((result: CompressResult) => {
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const reset = useCallback(() => {
    setState({ isLoading: false, progress: 0, result: null, error: null })
  }, [])

  return { compress, download, reset, ...state }
}
