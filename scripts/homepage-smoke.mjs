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
  getHomepageExplorerTools,
  getHomepageFaqStructuredData,
  getHomepagePopularTools,
  getHomepageProductMetrics,
  HOMEPAGE_FAQS,
  HOMEPAGE_FROM_PDF_IDS,
  HOMEPAGE_POPULAR_TOOL_IDS,
  HOMEPAGE_TO_PDF_IDS,
} from "../src/lib/home/homepage-tools.ts";
import { EDITOR_TOOL_DEFINITIONS } from "../src/lib/editor/editor-tool-registry.ts";
import { getToolById, tools } from "../src/lib/tools.ts";

assert.doesNotThrow(() => assertHomepageCuratedIds());

const popularTools = getHomepagePopularTools();
assert.equal(popularTools.length, HOMEPAGE_POPULAR_TOOL_IDS.length);
assert.deepEqual(
  popularTools.map((tool) => tool.id),
  [...HOMEPAGE_POPULAR_TOOL_IDS],
);
for (const tool of popularTools) {
  assert.equal(tool.href, getToolById(tool.id)?.href);
}

const explorerTools = getHomepageExplorerTools();
assert.equal(
  new Set(explorerTools.map((tool) => tool.id)).size,
  explorerTools.length,
);

for (const conversion of CONVERSION_REGISTRY) {
  const tool = getToolById(conversion.id);
  assert.ok(tool, `Missing canonical tool for ${conversion.id}`);
  assert.equal(tool.href, conversion.route);
  assert.equal(
    tool.capabilities.processingMode,
    conversion.processingMode === "client" ? "browser" : "backend",
  );
  if (conversion.processingMode === "provider") {
    assert.notEqual(conversion.status, "available");
    assert.ok(conversion.disabledReason);
  }
}

const metrics = getHomepageProductMetrics();
assert.equal(
  metrics.browserTools,
  tools.filter(
    (tool) =>
      tool.status === "working" &&
      tool.capabilities.processingMode === "browser",
  ).length,
);
assert.equal(metrics.conversionWorkflows, CONVERSION_REGISTRY.length);
assert.equal(
  metrics.editorCapabilities,
  EDITOR_TOOL_DEFINITIONS.filter(
    (definition) =>
      definition.visible &&
      definition.group !== "actions" &&
      definition.id !== "select",
  ).length,
);

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
  getFileActionSuggestions(pdfRecognition).some(
    (tool) => tool.id === "pdf-editor",
  ),
);
assert.equal(
  recognizeHomepageFile({ name: "too-large.pdf", size: 56 * 1024 * 1024 }),
  null,
);
assert.equal(
  recognizeHomepageFile({ name: "script.exe", size: 1024 }),
  null,
);

const sourceFiles = await Promise.all(
  [
    "../src/app/page.tsx",
    "../src/components/Header.tsx",
    "../src/components/Footer.tsx",
    "../src/components/home/ToolCard.tsx",
    "../src/components/home/ToolExplorer.tsx",
    "../src/components/home/HomeFaq.tsx",
    "../src/components/home/ProductProof.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const [
  pageSource,
  headerSource,
  footerSource,
  toolCardSource,
  explorerSource,
  faqSource,
  proofSource,
] = sourceFiles;

assert.doesNotMatch(pageSource.trimStart(), /^["']use client["']/);
assert.doesNotMatch(pageSource, /useRouter|pdfjs-dist|tesseract/i);
assert.doesNotMatch(
  `${pageSource}\n${headerSource}\n${footerSource}`,
  /\/tools\/organize/,
);
assert.match(pageSource, /getHomepageCapabilitySnapshot/);
assert.match(headerSource, /getHomepagePopularTools/);
assert.match(headerSource, /xl:flex/);
assert.match(headerSource, /aria-expanded=\{toolsOpen\}/);
assert.match(headerSource, /event\.key === "Escape"/);
assert.match(toolCardSource, /capability\.processingMode === "browser"/);
assert.match(toolCardSource, /Backend required/);
assert.match(explorerSource, /RESULT_LIMIT = 12/);
assert.match(explorerSource, /tool\.search\.keywords/);
assert.match(faqSource, /getHomepageFaqStructuredData/);
assert.match(proofSource, /getHomepageProductMetrics/);

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
    curatedIds: "passed",
    popularTools: popularTools.length,
    canonicalRoutes: "passed",
    capabilityBadges: "passed",
    providerGating: "passed",
    faqJsonLdParity: "passed",
    internalLinks: "passed",
    uniqueExplorerTools: explorerTools.length,
    registryDerivedMetrics: metrics,
    serverPage: "passed",
    fileRecommendations: "passed",
  }),
);

