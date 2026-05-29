import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompressionLevel = "low" | "medium" | "high";
type CompressionMethod = "backend" | "fallback" | "original";

const API_BASE = process.env.PDFMANTRA_PROCESSING_API_BASE_URL;
const SECRET = process.env.PDFMANTRA_SECRET_KEY;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function levelFromForm(value: FormDataEntryValue | null): CompressionLevel {
  return value === "low" || value === "high" ? value : "medium";
}

function fileNameFromForm(value: FormDataEntryValue | null) {
  const raw = typeof