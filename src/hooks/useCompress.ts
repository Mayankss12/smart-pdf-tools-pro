"use client";

import { useState } from "react";

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

function numberHeader(headers: Headers, name: string, fallback: number) {
  const value = Number(headers.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function textHeader(headers: Headers, name: string, fallback: string) {
  return headers.get(name) || fallback;
}

function outputName(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf")
    ? fileName