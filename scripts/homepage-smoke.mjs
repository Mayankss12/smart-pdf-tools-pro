import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CONVERSION_REGISTRY } from "../src/lib/conversions/registry.ts";
import {
  assertHomepageCuratedIds,
  getHomepageFaqStructuredData,
  getHomepageToolGridCategories,
  getHomepageToolGridTools,
  HOMEPAGE_FAQS,
  HOMEPAGE_TOOL_GRID_ORDER_IDS,
  isToolInHomepageGridCategory,
  matchesHomepageToolQuery,
} from "../src/lib/home/homepage-tools.ts";
import {
  getPublicLaunchReadyTools,
  isToolPubliclyLaunchReady,
} from "../src/lib/public-launch.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { getToolById } from "../src/lib/tools.ts";

assert.doesNotThrow(() => assertHomepageCuratedIds());

const snapshot = getPublicLaunchCapabilitySnapshot();
const unavailableIds = new Set([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
  "heic-to-pdf",
  "webpage-to-pdf",
  "protect-pdf",
  "unlock-pdf",
  "watermark-remover",
  "redact-pdf",
]);

const gridTools = getHomepageToolGridTools(snapshot);
const publicTools = getPublicLaunchReadyTools(snapshot).filter(
  (tool) => tool.visibility.searchable,
);

assert.ok(gridTools.length > 0);
assert.equal(new Set(gridTools.map((tool) => tool.id)).size, gridTools.length);
assert.deepEqual(
  new Set(gridTools.map((tool) => tool.id)),
  new Set(publicTools.map((tool) => tool.id)),
  "The homepage grid must cover every searchable launch-ready tool exactly once",
);
assert.ok(
  gridTools.every((tool) => isToolPubliclyLaunchReady(tool, snapshot)),
);
assert.deepEqual(
  gridTools.filter((tool) => unavailableIds.has(tool.id)),
  [],
);

const curatedGridIds = new Set(HOMEPAGE_TOOL_GRID_ORDER_IDS);
assert.equal(curatedGridIds.size, HOMEPAGE_TOOL_GRID_ORDER_IDS.length);
for (const id of HOMEPAGE_TOOL_GRID_ORDER_IDS) {
  assert.ok(getToolById(id), `Unknown curated homepage grid ID: ${id}`);
}

const categories = getHomepageToolGridCategories(gridTools);
assert.equal(categories[0]?.id, "all");
assert.equal(categories.some((category) => category.id === "popular"), false);
for (const tool of gridTools) {
  assert.ok(
    categories
      .filter((category) => category.id !== "all")
      .some((category) => isToolInHomepageGridCategory(tool, category.id)),
    `No specific homepage category covers ${tool.id}`,
  );
}
assert.equal(matchesHomepageToolQuery(getToolById("merge-pdf"), "combine"), true);
assert.equal(matchesHomepageToolQuery(getToolById("fill-sign"), "signature"), true);
assert.equal(matchesHomepageToolQuery(getToolById("merge-pdf"), "translate"), false);

for (const conversion of CONVERSION_REGISTRY) {
  const tool = getToolById(conversion.id);
  assert.ok(tool, `Missing canonical tool for ${conversion.id}`);
  assert.equal(tool.href, conversion.route);
}

const faqStructuredData = getHomepageFaqStructuredData();
assert.deepEqual(
  faqStructuredData.mainEntity.map((item) => ({
    question: item.name,
    answer: item.acceptedAnswer.text,
  })),
  HOMEPAGE_FAQS.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  })),
);

const sources = await Promise.all(
  [
    "../src/app/page.tsx",
    "../src/components/home/HomeHero.tsx",
    "../src/components/home/HomeToolsGrid.tsx",
    "../src/components/home/EditorShowcase.tsx",
    "../src/components/home/ProcessingPrivacy.tsx",
    "../src/components/home/HomeFaq.tsx",
    "../src/components/HeaderClient.tsx",
    "../src/components/Footer.tsx",
    "../src/app/sitemap.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const [
  pageSource,
  heroSource,
  gridSource,
  editorSource,
  privacySource,
  faqSource,
  headerSource,
  footerSource,
  sitemapSource,
] = sources;
const homepageSource = [
  pageSource,
  heroSource,
  gridSource,
  editorSource,
  privacySource,
  faqSource,
].join("\n");

assert.doesNotMatch(pageSource.trimStart(), /^["']use client["']/);
assert.match(pageSource, /getHomepageCapabilitySnapshot/);
assert.match(pageSource, /<HomeToolsGrid capabilities=\{capabilities\}/);
assert.doesNotMatch(pageSource, /PopularTools|ToolExplorer|ConversionHub/);
assert.doesNotMatch(heroSource, /SmartFileEntry|Jump straight to|quickActions/);
assert.match(heroSource, /Every PDF tool you need/);
assert.match(gridSource, /^"use client";/);
assert.doesNotMatch(gridSource, /Choose what you want to do/);
assert.doesNotMatch(gridSource, /<ArrowRight|,\s*ArrowRight/);
assert.doesNotMatch(gridSource, /\{tool\.description\}/);
assert.doesNotMatch(gridSource, /\{tool\.menuDescription\}/);
assert.match(gridSource, /grid-cols-2/);
assert.match(gridSource, /xl:grid-cols-6/);
assert.match(gridSource, /role="tablist"/);
assert.match(gridSource, /role="tabpanel"/);
assert.match(gridSource, /ArrowRight|ArrowLeft/);
assert.match(gridSource, /aria-label="Clear tool search"/);
assert.doesNotMatch(homepageSource, /pdfjs-dist|tesseract/i);
assert.doesNotMatch(homepageSource, /Coming soon|Backend required/i);
assert.doesNotMatch(
  homepageSource,
  /browser tools|conversion workflows|editor capabilities/i,
);
assert.match(headerSource, /launchReadyToolIds/);
assert.match(headerSource, /\/#pdf-tools/);
assert.doesNotMatch(headerSource, /#tool-explorer/);
assert.match(headerSource, /xl:flex/);
assert.match(headerSource, /aria-expanded=\{toolsOpen\}/);
assert.match(headerSource, /event\.key === "Escape"/);
assert.match(footerSource, /getPublicFooterTools/);
assert.match(sitemapSource, /getPublicSitemapTools/);
assert.match(faqSource, /getHomepageFaqStructuredData/);
assert.doesNotMatch(
  `${pageSource}\n${headerSource}\n${footerSource}`,
  /\/tools\/organize/,
);

for (const removedPath of [
  "../src/components/home/PopularTools.tsx",
  "../src/components/home/ToolExplorer.tsx",
  "../src/components/home/ConversionHub.tsx",
  "../src/components/home/ToolCard.tsx",
  "../src/components/home/SmartFileEntry.tsx",
]) {
  await assert.rejects(
    access(fileURLToPath(new URL(removedPath, import.meta.url))),
    `${removedPath} should be deleted`,
  );
}

await assert.doesNotReject(
  access(
    fileURLToPath(
      new URL("../src/app/tools/reorder/page.tsx", import.meta.url),
    ),
  ),
);
await assert.rejects(
  access(
    fileURLToPath(
      new URL("../src/app/tools/organize/page.tsx", import.meta.url),
    ),
  ),
);

for (const tool of gridTools) {
  const route = tool.href.split(/[?#]/)[0];
  const pagePath =
    route === "/"
      ? new URL("../src/app/page.tsx", import.meta.url)
      : new URL(`../src/app${route}/page.tsx`, import.meta.url);
  await assert.doesNotReject(
    access(fileURLToPath(pagePath)),
    `Missing internal page for ${route}`,
  );
}

console.log(
  JSON.stringify({
    homepageComposition: "passed",
    unifiedGridTools: gridTools.length,
    categoryCoverage: "passed",
    explicitSearch: "passed",
    tilePresentation: "passed",
    publicVisibility: "passed",
    faqJsonLdParity: "passed",
    routeIntegrity: "passed",
    serverPage: "passed",
  }),
);
