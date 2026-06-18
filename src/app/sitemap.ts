import type { MetadataRoute } from "next";

import { tools } from "@/lib/tools";

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
  "/desktop",
] as const;

function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function uniquePaths(paths: readonly string[]) {
  return Array.from(new Set(paths));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const toolPaths = tools
    .filter((tool) => tool.visibility.searchable && tool.status !== "coming-soon")
    .map((tool) => tool.href);

  return uniquePaths([...KEY_PAGES, ...toolPaths]).map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/tools") ? 0.85 : 0.75,
  }));
}
