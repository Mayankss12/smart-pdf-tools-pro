import type { MetadataRoute } from "next";

import { getPublicSitemapTools } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

const SITE_URL = "https://smart-pdf-tools-pro.vercel.app";

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
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
