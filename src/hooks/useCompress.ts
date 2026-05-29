"use client";

import { useState } from "react";

export type CompressionLevel = "low" | "medium" | "high";

export type CompressResult = {
  blob: Blob;
  url: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  method: string;
};

export function useCompress() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setIsLoading(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }

  function download(item = result) {
    if (!item) return;
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function compress(file: File, level: CompressionLevel = "medium") {
    setIsLoading(true);
    setProgress(20);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("level", level);
      const response = await fetch("/api/tools/compress", { method: "POST", body });
      if (!response.ok) throw new Error("Compression failed.");
      const blob = await response.blob();
      const compressedSize = Number(response.headers.get("