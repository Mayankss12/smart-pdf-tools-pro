"use client";
export type CompressionLevel = "low" | "medium" | "high";
export type CompressResult = { method: string; savedBytes: number; savedPercent: number; compressedSize: number };
export function useCompress() {
  async function compress(): Promise<CompressResult | null> { return null; }
  function download() {}
  function reset() {}
  return { compress, download, reset, isLoading: false, progress: 0, result: null, error: null