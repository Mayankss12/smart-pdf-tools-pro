"use client";

export type CompressionLevel = "low" | "medium" | "high";

export interface CompressResult {
  blob: Blob;
  url: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  method: string;
}

export function useCompress() {
  async function compress(): Promise<CompressResult | null> {
    return