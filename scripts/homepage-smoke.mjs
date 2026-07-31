import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CONVERSION_REGISTRY } from "../src/lib/conversions/registry.ts";
import { LOCAL_BROWSER_CONVERSION_IDS } from "../src/lib/conversions/local-browser-conversions.ts";
import {
  assertHomepageCuratedIds,
  assertToolDiscoveryModel,
  getHeaderToolSearchItems,
  getHomepageFaqStructuredData,
  getHomepageToolGridTools,
  getToolDiscoveryGroups,
  HOMEPAGE_FAQS,
  HOMEPAGE_FROM_PDF_IDS,
  HOMEPAGE_PENDING_CONVERSION_IDS,
  HOMEPAGE_TOOL_GRID_ORDER_IDS,
  HOMEPAGE_TO_PDF_IDS,
  matchesHomepageToolQuery,
} from "../src/lib/home/homepage-tools.ts";
import {
  getPublicLaunchReadyTools,
  isToolPubliclyLaunchReady,
} from "../src/lib/public-launch.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { getToolById } from "../src/lib/tools.ts";

const snapshot = getPublicLaunchCapabilitySnapshot();
const localIds = new Set(LOCAL_BROWSER_CONVERSION_IDS);
const pendingIds = new Set(
  HOMEPAGE_PENDING_CONVERSION_IDS.filter((id) => !localIds.has(id)),
);

assert.doesNotThrow(() => assertHomepageCuratedIds(snapshot));
assert.doesNotThrow(() => assertToolDiscoveryModel(snapshot));

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
for (const id of LOCAL_BROWSER_CONVERSION_IDS) {
  assert.ok(
    gridTools.some((tool) => tool.id === id),
    `Homepage grid is missing local Office conversion ${id}`,
  );
}
assert.deepEqual(
  gridTools.filter((tool) => pendingIds.has(tool.id)),
  [],
  "Pending provider conversions must not enter the plain homepage grid",
);

const curatedGridIds = new Set(HOMEPAGE_TOOL_GRID_ORDER_IDS);
assert.equal(curatedGridIds.size, HOMEPAGE_TOOL_GRID_ORDER_IDS.length);
for (const id of HOMEPAGE_TOOL_GRID_ORDER_IDS) {
  assert.ok(getToolById(id), `Unknown curated homepage grid ID: ${id}`);
}

assert.equal(matchesHomepageToolQuery(getToolById("merge-pdf"), "combine"), true);
assert.equal(matchesHomepageToolQuery(getToolById("fill-sign"), "signature"), true);
assert.equal(matchesHomepageToolQuery(getToolById("pdf-to-word"), "word"), true);
assert.equal(matchesHomepageToolQuery(getToolById("merge-pdf"), "translate"), false);

const discoveryGroups = getToolDiscoveryGroups(snapshot);
assert.deepEqual(
  discoveryGroups.map((group) => group.label),
  [
    "Edit & Sign",
    "Organize",
    "Convert from PDF",
    "Convert to PDF",
    "Optimize & OCR",
  ],
);
const discoveryItems = discoveryGroups.flatMap((group) => group.items);
assert.equal(
  new Set(discoveryItems.map((item) => item.tool.id)).size,
  discoveryItems.length,
  "Every discovery tool must have exactly one category owner",
);
assert.deepEqual(
  discoveryGroups
    .filter((group) =>
      group.items.some((item) => item.tool.id === "pdf-to-searchable-pdf"),
    )
    .map((group) => group.id),
  ["optimize-ocr"],
);

for (const id of LOCAL_BROWSER_CONVERSION_IDS) {
  const item = discoveryItems.find((candidate) => candidate.tool.id === id);
  assert.ok(item, `Header discovery is missing local conversion ${id}`);
  assert.equal(item.availability, "ready");
}
const pendingItems = discoveryItems.filter(
  (item) => item.availability === "coming-soon",
);
assert.deepEqual(
  new Set(pendingItems.map((item) => item.tool.id)),
  pendingIds,
);
const fromPdfItems =
  discoveryGroups.find((group) => group.id === "convert-from")?.items ?? [];
assert.deepEqual(
  new Set(fromPdfItems.map((item) => item.tool.id)),
  new Set(HOMEPAGE_FROM_PDF_IDS),
);
const toPdfItems =
  discoveryGroups.find((group) => group.id === "convert-to")?.items ?? [];
assert.deepEqual(
  new Set(toPdfItems.map((item) => item.tool.id)),
  new Set(HOMEPAGE_TO_PDF_IDS),
);
assert.equal(
  fromPdfItems.some((item) => item.tool.id === "pdf-to-searchable-pdf"),
  false,
);

const headerSearchItems = getHeaderToolSearchItems(snapshot);
assert.equal(
  new Set(headerSearchItems.map((item) => item.tool.id)).size,
  headerSearchItems.length,
);
assert.deepEqual(
  new Set(
    headerSearchItems
      .filter((item) => item.availability === "coming-soon")
      .map((item) => item.tool.id),
  ),
  pendingIds,
);
for (const id of LOCAL_BROWSER_CONVERSION_IDS) {
  assert.equal(
    headerSearchItems.find((item) => item.tool.id === id)?.availability,
    "ready",
  );
}

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
    "../src/components/Header.tsx",
    "../src/components/HeaderClient.tsx",
    "../src/components/header/HeaderToolSearch.tsx",
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
  headerServerSource,
  headerSource,
  headerSearchSource,
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
assert.match(pageSource, /assertHomepageCuratedIds\(capabilities\)/);
assert.doesNotMatch(pageSource, /PopularTools|ToolExplorer|ConversionHub/);
assert.doesNotMatch(heroSource, /SmartFileEntry|Jump straight to|quickActions/);
assert.match(heroSource, /Every PDF tool you need/);
assert.doesNotMatch(heroSource, /Browse PDF tools|ArrowDown/);
assert.doesNotMatch(gridSource.trimStart(), /^["']use client["']/);
assert.doesNotMatch(gridSource, /<ArrowRight|,\s*ArrowRight/);
assert.doesNotMatch(gridSource, /home-tool-search|Search tools|Full directory/);
assert.doesNotMatch(gridSource, /\{tool\.description\}|\{tool\.menuDescription\}/);
assert.match(gridSource, /grid-cols-2/);
assert.match(gridSource, /xl:grid-cols-6/);
assert.match(gridSource, />\s*PDF tools\s*</);
assert.doesNotMatch(gridSource, /role="tablist"|role="tab"|role="tabpanel"/);
assert.doesNotMatch(gridSource, /toolCategory|pushState|popstate/);
assert.match(gridSource, /getHomepageToolGridTools/);
assert.doesNotMatch(homepageSource, /pdfjs-dist|tesseract/i);
assert.doesNotMatch(homepageSource, /Backend required/i);

assert.match(headerServerSource, /capabilities=\{capabilitySnapshot\}/);
assert.doesNotMatch(headerSource, /All PDF Tools/);
assert.match(headerSource, /groups\.map/);
assert.match(headerSource, /openGroupId/);
assert.match(headerSource, /HeaderToolSearch/);
assert.match(headerSource, /event\.key === "Escape"/);
assert.match(headerSource, /aria-expanded=\{open\}/);
assert.doesNotMatch(headerSource, /View on homepage|group\.items\.length/);
assert.doesNotMatch(headerSource, /Open Editor|Open PDF Editor/);
assert.match(headerSearchSource, /MAX_RESULTS = 10/);
assert.match(headerSearchSource, /event\.ctrlKey \|\| event\.metaKey/);
assert.match(headerSearchSource, /event\.key === "ArrowDown"/);
assert.match(headerSearchSource, /event\.key === "ArrowUp"/);
assert.match(headerSearchSource, /event\.key === "Enter"/);
assert.match(headerSearchSource, /event\.key === "Escape"/);
assert.match(headerSearchSource, /aria-autocomplete="list"/);
assert.match(headerSearchSource, /aria-disabled="true"/);
assert.doesNotMatch(headerSearchSource, /Backend required|provider/i);
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
    localOfficeConversions: [...LOCAL_BROWSER_CONVERSION_IDS],
    pendingConversions: [...pendingIds],
    categoryCoverage: "passed",
    explicitSearch: "passed",
    tilePresentation: "passed",
    publicVisibility: "passed",
    faqJsonLdParity: "passed",
    routeIntegrity: "passed",
    serverPage: "passed",
  }),
);
