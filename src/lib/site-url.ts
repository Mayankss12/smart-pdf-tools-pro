const LOCAL_SITE_URL = "http://localhost:3000";

type SiteUrlEnvironment = Readonly<Record<string, string | undefined>>;

function withProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function normalizeSiteUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(withProtocol(candidate));
    const hasUnexpectedParts =
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash;

    if (hasUnexpectedParts) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalHostname(url.hostname))) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function requireValidSiteUrl(value: string, source: string) {
  const normalized = normalizeSiteUrl(value);
  if (!normalized) {
    throw new Error(
      `${source} must be an origin-only HTTPS URL, for example https://pdfmantra.example.`,
    );
  }
  return normalized;
}

export function resolveSiteUrl(
  environment: SiteUrlEnvironment = process.env,
): string {
  const configured = environment.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return requireValidSiteUrl(configured, "NEXT_PUBLIC_SITE_URL");
  }

  const vercelProductionUrl = environment.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return requireValidSiteUrl(
      vercelProductionUrl,
      "VERCEL_PROJECT_PRODUCTION_URL",
    );
  }

  const vercelDeploymentUrl = environment.VERCEL_URL?.trim();
  if (vercelDeploymentUrl) {
    return requireValidSiteUrl(vercelDeploymentUrl, "VERCEL_URL");
  }

  return LOCAL_SITE_URL;
}

export function getSiteUrl() {
  return resolveSiteUrl();
}

