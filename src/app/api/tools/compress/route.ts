import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let output = input;
  let method = "original";

  try {
    const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
    output = Buffer.from(await pdf.save({ useObjectStreams: true