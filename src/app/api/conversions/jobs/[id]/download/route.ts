import { isSameOriginRequest } from "@/lib/api-security";
import {
  ConversionIdentityError,
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
  if (!isSameOriginRequest(request)) {
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
    const output = await provider.downloadJob(ownerId, id);
    return new Response(output.body, {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Type": output.mimeType,
        "Content-Disposition": `attachment; filename="${output.fileName}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
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
