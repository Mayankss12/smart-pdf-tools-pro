import { PDFMANTRA_ANONYMOUS_ID_KEY, isAnonymousId } from "@/lib/anonymous-identity";

const ALLOWED_API_HEADERS = "Content-Type";
const DEFAULT_MAX_AGE_SECONDS = "600";

export function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

export function getOriginHeader(request: Request) {
  return request.headers.get("origin");
}

export function getRefererHeader(request: Request) {
  return request.headers.get("referer");
}

export function isSameOriginRequest(request: Request) {
  const origin = getOriginHeader(request);

  return !origin || origin === getRequestOrigin(request);
}

export function isSameSiteStateChangingRequest(request: Request) {
  const requestOrigin = getRequestOrigin(request);
  const origin = getOriginHeader(request);

  if (origin) {
    return origin === requestOrigin;
  }

  const referer = getRefererHeader(request);

  if (!referer) {
    return false;
  }

  try {
    return new URL(referer).origin === requestOrigin;
  } catch {
    return false;
  }
}

export function createNoStoreHeaders(request: Request, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  const origin = getOriginHeader(request);

  headers.set("Cache-Control", "no-store");
  headers.set("Vary", "Origin");

  if (origin && origin === getRequestOrigin(request)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

export function createCorsPreflightResponse(request: Request, methods: string) {
  if (!isSameOriginRequest(request)) {
    return new Response(null, {
      status: 403,
      headers: createNoStoreHeaders(request),
    });
  }

  return new Response(null, {
    status: 204,
    headers: createNoStoreHeaders(request, {
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": ALLOWED_API_HEADERS,
      "Access-Control-Max-Age": DEFAULT_MAX_AGE_SECONDS,
    }),
  });
}

export function createAnonymousIdentityCookie(anonymousId: string) {
  const encodedAnonymousId = encodeURIComponent(anonymousId);
  const secureDirective = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${PDFMANTRA_ANONYMOUS_ID_KEY}=${encodedAnonymousId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secureDirective}`;
}

export function getCookieValue(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) return null;

  for (const cookiePart of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookiePart.trim().split("=");

    if (rawName !== cookieName || rawValueParts.length === 0) continue;

    try {
      return decodeURIComponent(rawValueParts.join("="));
    } catch {
      return rawValueParts.join("=");
    }
  }

  return null;
}

export function getAnonymousIdentityCookie(request: Request) {
  const value = getCookieValue(request, PDFMANTRA_ANONYMOUS_ID_KEY);

  return isAnonymousId(value) ? value : null;
}

export function isVerifiedAnonymousIdentity(request: Request, anonymousId: string | null) {
  if (!isAnonymousId(anonymousId)) return false;

  return getAnonymousIdentityCookie(request) === anonymousId;
}
