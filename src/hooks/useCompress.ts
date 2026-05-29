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

function num(headers: Headers, key: string, fallback: number) {
  const value = Number(headers.get(key));
  return Number.isFinite(value) ? value : fallback;