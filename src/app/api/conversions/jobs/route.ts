import { NextResponse } from "next/server";

import { isSameSiteStateChangingRequest } from "@/lib/api-security";
import {
  ConversionIdentityError,
  conversionApiError,
  getConversionApiIdentity,
  getProviderError,
} from "@/lib/conversions/api";
import { getPublicConversionCapability } from "@/lib/conversions/capabilities";
import { getConversionProvider } from "@/lib/conversions/jobs";
import { PROVIDER_REQUEST_LIMIT_BYTES } from "@/lib/conversions/limits";
import { getConversionById } from "@/lib/conversions/registry";
import {
  ConversionValidationError,
  validateConversionFiles,
} from "@/lib/conversions/security";
import {
  validateAndResolvePublicWebpageUrl,
  type WebpageSecurityPolicy,
} from "@/lib/conversions/webpage-security.server";
import { canUseToolByTier } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) {
    return conversionApiError(
      request,
      403,
      "ORIGIN_REJECTED",
      "Request origin is not allowed.",
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > PROVIDER_REQUEST_LIMIT_BYTES) {
    return conversionApiError(
      request,
      413,
      "REQUEST_TOO_LARGE",
      "Conversion upload exceeds the server request limit.",
    );
  }
  const provider = getConversionProvider();
  if (!provider) {
    return conversionApiError(
      request,
      503,
      "PROVIDER_UNAVAILABLE",
      "The document conversion provider is not configured.",
    );
  }

  try {
    const identity = await getConversionApiIdentity();
    if (!identity) {
      return conversionApiError(
        request,
        401,
        "AUTHENTICATION_REQUIRED",
        "Sign in with an eligible plan to start backend conversions.",
      );
    }
    const ownerId = identity.ownerId;
    const form = await request.formData();
    const conversionId = form.get("conversionId");
    if (typeof conversionId !== "string") {
      return conversionApiError(
        request,
        400,
        "INVALID_CONVERSION",
        "A conversion identifier is required.",
      );
    }
    const conversion = getConversionById(conversionId);
    const capability = getPublicConversionCapability(conversionId);
    if (
      !conversion ||
      conversion.processingMode === "client" ||
      !capability?.enabled
    ) {
      return conversionApiError(
        request,
        409,
        "CAPABILITY_DISABLED",
        capability?.disabledReason ??
          "This backend conversion is not enabled.",
      );
    }
    if (
      !canUseToolByTier({
        tier: identity.tier,
        toolKey: conversion.entitlementToolKey,
      })
    ) {
      return conversionApiError(
        request,
        403,
        "PLAN_REQUIRED",
        "This backend conversion requires an eligible Pro or Admin plan.",
      );
    }
    const fileValue = form.get("file");
    const file = fileValue instanceof File ? fileValue : undefined;
    const sourceUrlValue = form.get("sourceUrl");
    const sourceUrl =
      typeof sourceUrlValue === "string" && sourceUrlValue.trim()
        ? sourceUrlValue.trim()
        : undefined;

    let webpageSecurityPolicy: WebpageSecurityPolicy | undefined;
    if (conversion.sourceFormat === "url") {
      if (!sourceUrl) {
        return conversionApiError(
          request,
          400,
          "URL_REQUIRED",
          "A public webpage URL is required.",
        );
      }
      const validation =
        await validateAndResolvePublicWebpageUrl(sourceUrl);
      if (validation.allowed === false) {
        return conversionApiError(
          request,
          400,
          "URL_REJECTED",
          validation.reason,
        );
      }
      webpageSecurityPolicy = validation.policy;
    } else {
      await validateConversionFiles(conversion, file ? [file] : []);
    }

    const job = await provider.createJob({
      ownerId,
      conversionId,
      file,
      sourceUrl,
      webpageSecurityPolicy,
    });
    return NextResponse.json(
      { ok: true, job },
      {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof ConversionValidationError) {
      return conversionApiError(request, 400, error.code, error.message);
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
