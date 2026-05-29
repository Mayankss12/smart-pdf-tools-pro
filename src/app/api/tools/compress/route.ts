import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompressionLevel = "low" | "medium" | "high";
type CompressionMethod = "backend" | "fallback" | "original";

const API_BASE = process.env.PDFMANTRA_PROCESSING_API_BASE_URL;
const SECRET = process.env.PDFMANTRA_SECRET_KEY;
