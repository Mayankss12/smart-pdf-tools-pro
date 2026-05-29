import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompressionLevel = "low" | "medium" | "high";
type CompressionMethod = "backend" | "fallback" | "original";

const API_BASE = process.env.PDFMANTRA_PROCESSING_API_BASE_URL;
const SECRET = process.env.PDFMANTRA_SECRET_KEY;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getLevel(value: FormDataEntryValue | null): CompressionLevel {
  if (value === "low" || value === "high") return value;
  return "medium";
}

function cleanFileName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "document";
}

function buildHeaders(originalSize: number, outputSize: number, method: CompressionMethod, level: CompressionLevel) {
  const savedBytes = Math.max(0, originalSize - outputSize);
  const savedPercent = originalSize > 0 ? Math.max(0, Math.round((savedBytes / originalSize) * 100)) : 0;

  return {
    "Content