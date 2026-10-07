import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const read = (relativePath) => readFile(path.join(process.cwd(), relativePath), "utf8");

const [
  rootLayout,
  guideSource,
  guideComponent,
  mergePage,
  compressPage,
  ocrPage,
  officePage,
  sitemapSource,
] = await Promise.all([
  read("src/app/layout.tsx"),
  read("src/lib/tool-guides.ts"),
  read("src/components/ToolSeoGuide.tsx"),
  read("src/app/tools/merge/page.tsx"),
  read("src/app/tools/compress/page.tsx"),
  read("src/app/tools/ocr/page.tsx"),
  read("src/components/PdfOfficeConversionPage.tsx"),
  read("src/app/sitemap.ts"),
]);

assert.match(rootLayout, /verification:\s*\{\s*google:/s);
assert.match(rootLayout, /ZLJyGy3l5VBH6-AK-RcwZJ6CSQmzHDJV4BAMVo_JZuw/);
assert.match(rootLayout, /@vercel\/analytics\/next/);
assert.match(rootLayout, /@vercel\/speed-insights\/next/);
assert.match(rootLayout, /<Analytics \/>/);
assert.match(rootLayout, /<SpeedInsights \/>/);

for (const toolId of [
  "merge-pdf",
  "compress-pdf",
  "pdf-to-searchable-pdf",
  "pdf-to-word",
]) {
  assert.match(guideSource, new RegExp(`"${toolId}"`));
}

assert.match(guideComponent, /How to use this tool/);
assert.match(guideComponent, /What to check/);
assert.match(guideComponent, /Frequently asked questions/);
assert.match(guideComponent, /<details/);

assert.match(mergePage, /TOOL_GUIDES\["merge-pdf"\]/);
assert.match(compressPage, /TOOL_GUIDES\["compress-pdf"\]/);
assert.match(ocrPage, /TOOL_GUIDES\["pdf-to-searchable-pdf"\]/);
assert.match(officePage, /TOOL_GUIDES\["pdf-to-word"\]/);

assert.match(sitemapSource, /"\/editor"/);
assert.match(sitemapSource, /getPublicSitemapTools/);

console.log(
  JSON.stringify({
    googleVerification: "passed",
    peopleFirstGuides: 4,
    visibleInstructions: "passed",
    honestLimitations: "passed",
    faqContent: "passed",
    sitemapCoverage: "passed",
    webAnalytics: "enabled",
    speedInsights: "enabled",
  }),
);
