import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompressionLevel = "low" | "medium" | "high";
type CompressionMethod = "backend" | "fallback" | "original";

const PROCESSING_API_BASE = process.env.PDFMANTRA_PROCESSING_API_BASE_URL;
const SECRET_KEY = process.env.PDFMANTRA_SECRET_KEY;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const VALID_LEVELS: readonly