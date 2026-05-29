"use client";
import { useState } from "react";
export type CompressionLevel = "low" | "medium" | "high";
export type CompressResult = { blob: Blob; url: string; fileName: string; originalSize: number; compressedSize: number; savedBytes: number; savedPercent: number; method: string };
export function useCompress() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress