import { useCallback, useEffect, useRef, useState } from "react";

import {
  compressPdf,
  type CompressionLevel,
  type CompressionMode,
  type PdfCompressionResult,
} from "@/lib/pdf-compress";

export type { CompressionLevel, CompressionMode };

export type CompressResult = PdfCompressionResult & {
  readonly filename: string;
  readonly savedBytes: number;
  readonly savedPercent: number;
  readonly level: CompressionLevel;
};

export function useCompress() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compress = useCallback(
    async ({
      file,
      level = "medium",
      mode = "auto",
      targetBytes = null,
      removeMetadata = false,
    }: {
      readonly file: File;
      readonly level?: CompressionLevel;
      readonly mode?: CompressionMode;
      readonly targetBytes?: number | null;
      readonly removeMetadata?: boolean;
    }): Promise<CompressResult | null> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);
      setProgress(null);
      setProgressMessage("Preparing compression…");
      setResult(null);
      setError(null);

      try {
        const compressed = await compressPdf(file, {
          level,
          mode,
          targetBytes,
          removeMetadata,
          signal: controller.signal,
          onProgress(next) {
            setProgress(next.percent);
            setProgressMessage(next.message);
          },
        });
        const savedBytes = Math.max(0, compressed.originalSize - compressed.compressedSize);
        const savedPercent =
          compressed.originalSize > 0
            ? Number(((savedBytes / compressed.originalSize) * 100).toFixed(1))
            : 0;
        const completed: CompressResult = {
          ...compressed,
          filename: file.name.replace(/\.pdf$/i, "_compressed.pdf"),
          savedBytes,
          savedPercent,
          level,
        };
        setResult(completed);
        return completed;
      } catch (caughtError) {
        const cancelled =
          controller.signal.aborted ||
          (caughtError instanceof DOMException && caughtError.name === "AbortError");
        setError(
          cancelled
            ? "Compression cancelled."
            : caughtError instanceof Error
              ? caughtError.message
              : "Compression failed.",
        );
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const download = useCallback((value: CompressResult) => {
    const url = URL.createObjectURL(value.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = value.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setProgress(null);
    setProgressMessage("");
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    compress,
    cancel,
    download,
    reset,
    isLoading,
    progress,
    progressMessage,
    result,
    error,
  };
}
