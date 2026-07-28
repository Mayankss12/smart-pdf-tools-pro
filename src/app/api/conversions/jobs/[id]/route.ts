import { NextResponse } from "next/server";

import {
  conversionApiError,
  getConversionApiOwner,
  getProviderError,
} from "@/lib/conversions/api";
import {
  assertSafeJobId,
  getConversionProvider,
} from "@/lib/conversions/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ownerId = await getConversionApiOwner();
  if (!ownerId) {
    return conversionApiError(
      request,
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required.",
    );
  }
  const provider = getConversionProvider();
  if (!provider) {
    return conversionApiError(
      request,
      503,
      "PROVIDER_UNAVAILABLE",
      "The conversion provider is not configured.",
    );
  }
  try {
    const { id } = await context.params;
    assertSafeJobId(id);
    const job = await provider.getJob(ownerId, id);
    return NextResponse.json(
      { ok: true, job },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const safe = getProviderError(error);
    return conversionApiError(request, 502, safe.code, safe.message);
  }
}
