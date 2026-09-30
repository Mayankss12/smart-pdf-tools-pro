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
  ).map((tool) => tool.href);

  return uniquePaths([...KEY_PAGES, ...toolPaths]).map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/tools") ? 0.85 : 0.75,
  }));
}
