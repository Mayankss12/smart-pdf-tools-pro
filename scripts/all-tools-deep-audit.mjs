import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { getPublicLaunchReadyTools } from "../src/lib/public-launch.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";

const LIVE_FLAG = "--live";
const liveMode = process.argv.includes(LIVE_FLAG);
const baseUrl = process.env.PDFMANTRA_AUDIT_BASE_URL ?? "https://pdfmantra.in";

const COVERAGE_BY_TOOL_ID = {
  "pdf-editor": ["editor-export-smoke.mjs", "verified-bugs-smoke.mjs"],
  "compare-pdf": ["pro-comparison-smoke.mjs"],
  "form-creator": ["editor-form-smoke.mjs", "stage-two-platform-smoke.mjs"],
  "pdfa-preflight": ["stage-two-platform-smoke.mjs"],
  "sign-pdf": ["fill-sign-smoke.mjs", "saved-signatures-smoke.mjs"],
  "fill-sign": ["fill-sign-smoke.mjs", "saved-signatures-smoke.mjs"],
  "annotate-pdf": ["editor-export-smoke.mjs", "standalone-overlay-smoke.mjs"],
  "highlight-pdf": ["editor-export-smoke.mjs", "standalone-overlay-smoke.mjs"],
  "watermark-pdf": ["standalone-overlay-smoke.mjs"],
  "page-numbers": ["standalone-overlay-smoke.mjs"],
  "merge-pdf": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "split-pdf": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "rotate-pdf": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "delete-pages": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "extract-pages": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "reorder-pages": ["editor-administration-smoke.mjs", "pdf-rebuild-safety-smoke.mjs"],
  "compress-pdf": ["compression-smoke.mjs"],
  "protect-pdf": ["pdf-security-smoke.mjs"],
  "unlock-pdf": ["pdf-security-smoke.mjs"],
  "redact-pdf": ["pdf-security-smoke.mjs", "stage-one-platform-smoke.mjs"],
  "crop-pdf": ["stage-one-platform-smoke.mjs"],
  "flatten-pdf": ["stage-one-platform-smoke.mjs"],
  "repair-pdf": ["stage-one-platform-smoke.mjs"],
  "pdf-metadata": ["stage-one-platform-smoke.mjs"],
  "bates-numbering": ["stage-one-platform-smoke.mjs"],
  "advanced-split": ["stage-one-platform-smoke.mjs"],
  "batch-workflows": ["stage-one-platform-smoke.mjs"],
  "pdf-to-word": ["office-conversions-smoke.mjs", "compression-smoke.mjs"],
  "pdf-to-excel": ["office-conversions-smoke.mjs"],
  "pdf-to-powerpoint": ["office-conversions-smoke.mjs"],
  "pdf-to-text": ["conversion-platform-smoke.mjs"],
  "pdf-to-html": ["conversion-platform-smoke.mjs"],
  "pdf-to-jpg": ["pdf-to-images-smoke.mjs"],
  "pdf-to-png": ["pdf-to-images-smoke.mjs"],
  "pdf-to-webp": ["pdf-to-images-smoke.mjs"],
  "pdf-to-images": ["pdf-to-images-smoke.mjs"],
  "pdf-to-searchable-pdf": ["editor-export-smoke.mjs", "stage-two-platform-smoke.mjs"],
  "jpg-to-pdf": ["images-to-pdf-smoke.mjs"],
  "png-to-pdf": ["images-to-pdf-smoke.mjs"],
  "webp-to-pdf": ["images-to-pdf-smoke.mjs"],
  "images-to-pdf": ["images-to-pdf-smoke.mjs"],
  "txt-to-pdf": ["text-to-pdf-unicode-smoke.mjs"],
  "markdown-to-pdf": ["text-to-pdf-unicode-smoke.mjs", "conversion-platform-smoke.mjs"],
  "html-to-pdf": ["text-to-pdf-unicode-smoke.mjs", "conversion-platform-smoke.mjs"],
  "csv-to-pdf": ["text-to-pdf-unicode-smoke.mjs", "conversion-platform-smoke.mjs"],
  "docx-to-pdf": ["office-conversions-smoke.mjs"],
  "xlsx-to-pdf": ["office-conversions-smoke.mjs"],
  "pptx-to-pdf": ["office-conversions-smoke.mjs"],
};

function routeSourcePath(href) {
  if (href === "/editor") return path.join(process.cwd(), "src", "app", "editor", "page.tsx");
  const segments = href.split("/").filter(Boolean);
  return path.join(process.cwd(), "src", "app", ...segments, "page.tsx");
}

async function auditLiveRoute(tool) {
  const response = await fetch(new URL(tool.href, baseUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { "user-agent": "PDFMantra launch audit" },
  });
  const html = await response.text();
  const pageTitle =
    html
      .match(/<title>(.*?)<\/title>/is)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() ?? "";
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    "";
  assert.equal(response.status, 200, `${tool.id} returned HTTP ${response.status}`);
  assert.ok(html.length > 1_000, `${tool.id} returned an unexpectedly small page`);
  assert.doesNotMatch(pageTitle, /404|not found/i, `${tool.id} rendered a not-found title`);
  assert.notEqual(
    pageTitle,
    "PDFMantra - Smart PDF Workspace",
    `${tool.id} is still using the generic site title`,
  );
  const canonicalUrl = new URL(canonical);
  const expectedUrl = new URL(tool.href, baseUrl);
  assert.equal(canonicalUrl.pathname, expectedUrl.pathname, `${tool.id} has an incorrect canonical path`);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(expectedUrl.hostname)) {
    assert.equal(canonicalUrl.origin, expectedUrl.origin, `${tool.id} has an incorrect canonical origin`);
  }
  assert.doesNotMatch(html, /Application error: a client-side exception/i, `${tool.id} rendered an application error`);
  return { status: response.status, bytes: html.length, pageTitle, canonical };
}

const publicTools = getPublicLaunchReadyTools(getPublicLaunchCapabilitySnapshot());
const runSmokeSource = await readFile(path.join(process.cwd(), "scripts", "run-smoke.mjs"), "utf8");
const audited = [];

assert.ok(publicTools.length > 0, "No public tools were returned for the audit");
assert.equal(
  new Set(publicTools.map((tool) => tool.id)).size,
  publicTools.length,
  "Public tool IDs must be unique",
);

for (const tool of publicTools) {
  assert.ok(tool.title.trim(), `${tool.id} is missing a customer-facing title`);
  assert.ok(tool.description.trim(), `${tool.id} is missing a description`);
  assert.ok(tool.search.aliases.length > 0, `${tool.id} is missing search aliases`);
  assert.ok(tool.search.keywords.length > 0, `${tool.id} is missing search keywords`);
  assert.ok(tool.search.useCases.length > 0, `${tool.id} is missing search use cases`);

  const sourcePath = routeSourcePath(tool.href);
  await access(sourcePath);
  const source = await readFile(sourcePath, "utf8");
  assert.doesNotMatch(source, /Coming soon/i, `${tool.id} public route contains Coming soon`);

  const layoutPath = path.join(path.dirname(sourcePath), "layout.tsx");
  await access(layoutPath);
  const layoutSource = await readFile(layoutPath, "utf8");
  const metadataToolId = tool.href === "/editor" ? "pdf-editor" : tool.id;
  assert.match(
    layoutSource,
    new RegExp(`buildToolMetadata\\(["']${metadataToolId}["']\\)`),
    `${tool.id} is missing route-specific metadata`,
  );

  const coverage = COVERAGE_BY_TOOL_ID[tool.id];
  assert.ok(coverage?.length, `${tool.id} has no functional smoke coverage assignment`);
  for (const suite of coverage) {
    await access(path.join(process.cwd(), "scripts", suite));
    assert.match(runSmokeSource, new RegExp(suite.replaceAll(".", "\\.")), `${suite} is not part of test:smoke`);
  }

  audited.push({
    id: tool.id,
    title: tool.title,
    route: tool.href,
    routeSource: path.relative(process.cwd(), sourcePath).replaceAll("\\", "/"),
    metadataSource: path.relative(process.cwd(), layoutPath).replaceAll("\\", "/"),
    coverage,
    live: liveMode ? await auditLiveRoute(tool) : undefined,
  });
}

const routeGroups = Object.values(
  audited.reduce((groups, entry) => {
    groups[entry.route] ??= { route: entry.route, toolIds: [] };
    groups[entry.route].toolIds.push(entry.id);
    return groups;
  }, {}),
);

console.log(
  JSON.stringify(
    {
      result: "passed",
      mode: liveMode ? "source-and-live" : "source",
      baseUrl: liveMode ? baseUrl : undefined,
      publicTools: audited.length,
      uniqueRoutes: routeGroups.length,
      routeGroups,
      tools: audited,
    },
    null,
    2,
  ),
);
