import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CONVERSION_REGISTRY } from "../src/lib/conversions/registry.ts";
import {
  getFileActionSuggestions,
  recognizeHomepageFile,
} from "../src/lib/home/file-action-suggestions.ts";
import {
  assertHomepageCuratedIds,
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
  getHomepageExplorerTools,
  getHomepageFaqStructuredData,
  getHomepagePopularTools,
  HOMEPAGE_FAQS,
  HOMEPAGE_FROM_PDF_IDS,
  HOMEPAGE_POPULAR_TOOL_IDS,
  HOMEPAGE_TO_PDF_IDS,
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

const popularTools = getHomepagePopularTools(snapshot);
assert.deepEqual(
  popularTools.map((tool) => tool.id),
  [...HOMEPAGE_POPULAR_TOOL_IDS],
);
assert.ok(
  popularTools.every((tool) => isToolPubliclyLaunchReady(tool, snapshot)),
);

const explorerTools = getHomepageExplorerTools(snapshot);
assert.equal(
  new Set(explorerTools.map((tool) => tool.id)).size,
  explorerTools.length,
);
assert.deepEqual(
  explorerTools.filter((tool) => unavailableIds.has(tool.id)),
  [],
);

const conversionTools = [
  ...getHomepageConversionsFromPdf(snapshot),
  ...getHomepageConversionsToPdf(snapshot),
];
assert.deepEqual(
  conversionTools.filter((conversion) => unavailableIds.has(conversion.id)),
  [],
);

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

const pdfRecognition = recognizeHomepageFile({
  name: "document.pdf",
  size: 1024,
});
assert.ok(pdfRecognition);
assert.ok(
  getFileActionSuggestions(pdfRecognition, snapshot).some(
    (tool) => tool.id === "pdf-editor",
  ),
);
const officeRecognition = recognizeHomepageFile({
  name: "document.docx",
  size: 1024,
});
assert.ok(officeRecognition);
assert.deepEqual(getFileActionSuggestions(officeRecognition, snapshot), []);
assert.equal(
  recognizeHomepageFile({ name: "too-large.pdf", size: 56 * 1024 * 1024 }),
  null,
);
assert.equal(
  recognizeHomepageFile({ name: "script.exe", size: 1024 }),
  null,
);

const sources = await Promise.all(
  [
    "../src/app/page.tsx",
    "../src/components/HeaderClient.tsx",
    "../src/components/Footer.tsx",
    "../src/components/ToolsDirectoryClient.tsx",
    "../src/components/home/ToolCard.tsx",
    "../src/components/home/ToolExplorer.tsx",
    "../src/components/home/ConversionHub.tsx",
    "../src/components/home/HomeFaq.tsx",
    "../src/app/sitemap.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const [
  pageSource,
  headerSource,
  footerSource,
  directorySource,
  toolCardSource,
  explorerSource,
  conversionSource,
  faqSource,
  sitemapSource,
] = sources;
const homepageSource = [
  pageSource,
  toolCardSource,
  explorerSource,
  conversionSource,
  faqSource,
].join("\n");

assert.doesNotMatch(pageSource.trimStart(), /^["']use client["']/);
assert.doesNotMatch(pageSource, /useRouter|pdfjs-dist|tesseract/i);
assert.doesNotMatch(
  pageSource,
  /HomepageTrustStrip|ProductProof|WorkflowStories/,
);
assert.doesNotMatch(homepageSource, /Coming soon|Backend required/i);
assert.doesNotMatch(
  homepageSource,
  /browser tools|conversion workflows|editor capabilities/i,
);
assert.doesNotMatch(conversionSource, /Advanced conversions/i);
assert.match(pageSource, /getHomepageCapabilitySnapshot/);
assert.match(headerSource, /launchReadyToolIds/);
assert.match(headerSource, /xl:flex/);
assert.match(headerSource, /aria-expanded=\{toolsOpen\}/);
assert.match(headerSource, /event\.key === "Escape"/);
assert.match(directorySource, /launchReadyToolIds/);
assert.match(footerSource, /getPublicFooterTools/);
assert.match(sitemapSource, /getPublicSitemapTools/);
assert.doesNotMatch(
  `${pageSource}\n${headerSource}\n${footerSource}`,
  /\/tools\/organize/,
);
assert.doesNotMatch(toolCardSource, />\s*Browser\s*</);
assert.doesNotMatch(explorerSource, /Coming soon|Backend required/i);
assert.doesNotMatch(conversionSource, /Coming soon|Backend required/i);
assert.match(faqSource, /getHomepageFaqStructuredData/);

for (const removedPath of [
  "../src/components/home/HomepageTrustStrip.tsx",
  "../src/components/home/ProductProof.tsx",
  "../src/components/home/WorkflowStories.tsx",
  "../src/lib/home/homepage-metrics.ts",
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

const publicTools = getPublicLaunchReadyTools(snapshot);
assert.ok(publicTools.length > 0);
assert.deepEqual(
  publicTools.filter((tool) => unavailableIds.has(tool.id)),
  [],
);

const curatedRouteIds = new Set([
  ...HOMEPAGE_POPULAR_TOOL_IDS,
  ...HOMEPAGE_FROM_PDF_IDS,
  ...HOMEPAGE_TO_PDF_IDS,
]);
for (const id of curatedRouteIds) {
  const tool = getToolById(id);
  assert.ok(tool);
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
    publicPopularTools: popularTools.length,
    publicExplorerTools: explorerTools.length,
    publicConversions: conversionTools.length,
    publicVisibility: "passed",
    faqJsonLdParity: "passed",
    routeIntegrity: "passed",
    serverPage: "passed",
    fileRecommendations: "passed",
  }),
);
