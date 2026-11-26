import type { MetadataRoute } from "next";

import { getPublicSitemapTools } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";
import { getSiteUrl } from "@/lib/site-url";

const KEY_PAGES = [
  "",
  "/tools",
  "/editor",
  "/features",
  "/pricing",
  "/about",
  "/security",
  "/privacy",
  "/terms",
] as const;

// Office-to-PDF tools only convert text locally (no real layout rendering yet).
// Keep them out of the sitemap until a full rendering provider exists.
const SITEMAP_EXCLUDED_PATHS: ReadonlySet<string> = new Set([
  "/tools/word-to-pdf",
  "/tools/excel-to-pdf",
  "/tools/powerpoint-to-pdf",
]);

function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function uniquePaths(paths: readonly string[]) {
  return Array.from(new Set(paths));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const toolPaths = getPublicSitemapTools(
    getPublicLaunchCapabilitySnapshot(),
  )
    .map((tool) => tool.href)
    .filter((href) => !SITEMAP_EXCLUDED_PATHS.has(href));

  return uniquePaths([...KEY_PAGES, ...toolPaths]).map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/tools") ? 0.85 : 0.75,
  }));
}
