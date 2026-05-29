"use client";

import { useMemo, useState } from "react";

export type CompressionLevel = "low" | "medium" | "high";

export interface CompressResult {
  readonly blob: Blob;
  readonly url: string;
  readonly fileName: string;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly savedBytes: number;
  readonly savedPercent: number;
  readonly method: string;
}

function readNumberHeader(headers: Headers, name: string, fallback: number) {
  const value = Number(headers.get