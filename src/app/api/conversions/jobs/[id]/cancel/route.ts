import { NextResponse } from "next/server";

import { isSameSiteStateChangingRequest } from "@/lib/api-security";
import {
  ConversionIdentityError,
  conversionApiError,
  getConversionApiOwner,
  getProviderError,
} from "@/lib/conversions/api";
import {
  assertSafeJobId,
  ConversionJobIdError,
  getConversionProvider,
} from "@/lib/conversions/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameSiteStateChangingRequest(request)) {
    return conversionApiError(
      request,
      403,
      "ORIGIN_REJECTED",
      "Request origin is not allowed.",
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
    const ownerId = await getConversionApiOwner();
    if (!ownerId) {
      return conversionApiError(
        request,
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }
    const { id } = await context.params;
    assertSafeJobId(id);
    const job = await provider.cancelJob(ownerId, id);
    return NextResponse.json(
      { ok: true, job },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ConversionJobIdError) {
      return conversionApiError(
        request,
        400,
        error.code,
        error.message,
      );
    }
    if (error instanceof ConversionIdentityError) {
      return conversionApiError(
        request,
        503,
        "IDENTITY_UNAVAILABLE",
        error.message,
      );
    }
    const safe = getProviderError(error);
    return conversionApiError(request, 502, safe.code, safe.message);
  }
}
