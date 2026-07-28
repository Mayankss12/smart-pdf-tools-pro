import { NextResponse } from "next/server";

import { getPublicConversionCapabilities } from "@/lib/conversions/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      conversions: getPublicConversionCapabilities(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
