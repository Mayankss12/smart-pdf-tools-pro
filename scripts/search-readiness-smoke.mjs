import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const read = (relativePath) => readFile(path.join(process.cwd(), relativePath), "utf8");

const [
  rootLayout,
  guideSource,
  guideComponent,
  guideLayout,
  metadataSource,
  mergePage,
  compressPage,
  ocrPage,
  officePage,
  sitemapSource,
  homepageSource,
  aboutPage,
  splitLayout,
  fillSignLayout,
  imageExportLayout,
  imageImportLayout,
  compareLayout,
  formLayout,
  protectLayout,
] = await Promise.all([
  read("src/app/layout.tsx"),
  read("src/lib/tool-guides.ts"),
  read("src/components/ToolSeoGuide.tsx"),
  read("src/components/ToolGuideRouteLayout.tsx"),
  read("src/lib/tool-metadata.ts"),
  read("src/app/tools/merge/page.tsx"),
  read("src/app/tools/compress/page.tsx"),
  read("src/app/tools/ocr/page.tsx"),
  read("src/components/PdfOfficeConversionPage.tsx"),
  read("src/app/sitemap.ts"),
  read("src/app/page.tsx"),
  read("src/app/about/page.tsx"),
  read("src/app/tools/split/layout.tsx"),
  read("src/app/tools/fill-sign/layout.tsx"),
  read("src/app/tools/pdf-to-images/layout.tsx"),
  read("src/app/tools/images-to-pdf/layout.tsx"),
  read("src/app/tools/compare/layout.tsx"),
  read("src/app/tools/form-creator/layout.tsx"),
  read("src/app/tools/protect/layout.tsx"),
]);

assert.match(rootLayout, /verification:\s*\{\s*google:/s);
assert.match(rootLayout, /ZLJyGy3l5VBH6-AK-RcwZJ6CSQmzHDJV4BAMVo_JZuw/);
assert.match(rootLayout, /@vercel\/analytics\/next/);
assert.match(rootLayout, /@vercel\/speed-insights\/next/);
assert.match(rootLayout, /<Analytics \/>/);
assert.match(rootLayout, /<SpeedInsights \/>/);

for (const toolId of [
  "pdf-editor",
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-images",
  "images-to-pdf",
  "jpg-to-pdf",
  "pdf-to-searchable-pdf",
  "pdf-to-word",
  "compare-pdf",
  "form-creator",
  "reorder-pages",
  "rotate-pdf",
  "protect-pdf",
]) {
  assert.match(guideSource, new RegExp(`"${toolId}"`));
  assert.match(metadataSource, new RegExp(`"${toolId}"`));
}

assert.match(guideComponent, /How to use this tool/);
assert.match(guideComponent, /What to check/);
assert.match(guideComponent, /Frequently asked questions/);
assert.match(guideComponent, /Continue your PDF workflow/);
assert.match(guideComponent, /<details/);
assert.match(guideComponent, /BreadcrumbList/);
assert.match(guideComponent, /WebApplication/);
assert.match(guideComponent, /HowTo/);
assert.match(guideComponent, /FAQPage/);
assert.match(guideLayout, /ToolSeoGuide/);

assert.match(mergePage, /TOOL_GUIDES\["merge-pdf"\]/);
assert.match(compressPage, /TOOL_GUIDES\["compress-pdf"\]/);
assert.match(ocrPage, /TOOL_GUIDES\["pdf-to-searchable-pdf"\]/);
assert.match(officePage, /TOOL_GUIDES\["pdf-to-word"\]/);

for (const [source, toolId] of [
  [splitLayout, "split-pdf"],
  [fillSignLayout, "fill-sign"],
  [imageExportLayout, "pdf-to-images"],
  [imageImportLayout, "images-to-pdf"],
  [compareLayout, "compare-pdf"],
  [formLayout, "form-creator"],
  [protectLayout, "protect-pdf"],
]) {
  assert.match(source, new RegExp(`ToolGuideRouteLayout toolId="${toolId}"`));
}

assert.match(sitemapSource, /"\/editor"/);
assert.match(sitemapSource, /getPublicSitemapTools/);
assert.match(homepageSource, /disambiguatingDescription/);
assert.match(homepageSource, /PDF productivity software/);
assert.match(aboutPage, /not a library of downloadable books or religious texts/);
await assert.rejects(
  access(path.join(process.cwd(), "src/app/gita/[id]/page.tsx")),
  /ENOENT/,
);

console.log(
  JSON.stringify({
    googleVerification: "passed",
    peopleFirstGuides: 15,
    visibleInstructions: "passed",
    honestLimitations: "passed",
    faqContent: "passed",
    contextualInternalLinks: "passed",
    structuredData: "passed",
    sitemapCoverage: "passed",
    webAnalytics: "enabled",
    speedInsights: "enabled",
    brandDisambiguation: "passed",
    conflictingLegacyRoutes: "retired",
  }),
);
