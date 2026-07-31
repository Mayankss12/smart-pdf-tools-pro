import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CONVERSION_REGISTRY } from "../src/lib/conversions/registry.ts";
import { getPublicConversionCapabilities } from "../src/lib/conversions/capabilities.ts";
import { LOCAL_BROWSER_CONVERSION_IDS } from "../src/lib/conversions/local-browser-conversions.ts";
import { EDITOR_TOOL_DEFINITIONS } from "../src/lib/editor/editor-tool-registry.ts";
import { getHomepageToolGridTools } from "../src/lib/home/homepage-tools.ts";
import { getPublicFooterTools } from "../src/lib/public-launch-collections.ts";
import {
  getPublicLaunchReadyTools,
  getPublicSitemapTools,
  getPublicToolsDirectory,
  isToolPubliclyLaunchReady,
  searchPublicLaunchTools,
} from "../src/lib/public-launch.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { tools } from "../src/lib/tools.ts";

const snapshot = getPublicLaunchCapabilitySnapshot();
const localIds = new Set(LOCAL_BROWSER_CONVERSION_IDS);
const capabilityById = new Map(
  getPublicConversionCapabilities().map((capability) => [
    capability.id,
    capability,
  ]),
);

const groups = {
  publicWorking: getPublicLaunchReadyTools(snapshot),
  backendRequired: tools.filter(
    (tool) => tool.status === "backend-required" && !localIds.has(tool.id),
  ),
  comingSoon: tools.filter((tool) => tool.status === "coming-soon"),
  maintenanceOrDisabled: CONVERSION_REGISTRY.filter((conversion) => {
    const capability = capabilityById.get(conversion.id);
    return (
      conversion.status === "maintenance" ||
      conversion.status === "disabled" ||
      capability?.status === "maintenance" ||
      capability?.status === "disabled"
    );
  }),
  editorBackendFeatures: EDITOR_TOOL_DEFINITIONS.filter(
    (definition) => definition.availability === "requires-backend",
  ),
};

const publicSurfaces = {
  homepageGrid: getHomepageToolGridTools(snapshot),
  header: getPublicLaunchReadyTools(snapshot),
  toolsDirectory: getPublicToolsDirectory(snapshot),
  search: searchPublicLaunchTools("", snapshot).map((result) => result.tool),
  sitemap: getPublicSitemapTools(snapshot),
  footer: getPublicFooterTools(snapshot),
};

for (const [surface, surfaceTools] of Object.entries(publicSurfaces)) {
  for (const tool of surfaceTools) {
    assert.equal(
      isToolPubliclyLaunchReady(tool, snapshot),
      true,
      `${surface} exposes non-launch-ready tool ${tool.id}`,
    );
  }
}

for (const id of LOCAL_BROWSER_CONVERSION_IDS) {
  assert.ok(
    groups.publicWorking.some((tool) => tool.id === id),
    `Locally implemented conversion is not publicly launch ready: ${id}`,
  );
  const capability = capabilityById.get(id);
  assert.equal(capability?.enabled, true);
  assert.equal(capability?.status, "available");
  assert.equal(capability?.processingMode, "client");
}

const backendMinimum = [
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
  "heic-to-pdf",
  "webpage-to-pdf",
];
for (const id of backendMinimum) {
  assert.ok(
    groups.backendRequired.some((tool) => tool.id === id),
    `Backend-required launch group is missing ${id}`,
  );
}

const comingSoonMinimum = [
  "protect-pdf",
  "unlock-pdf",
  "watermark-remover",
  "redact-pdf",
];
for (const id of comingSoonMinimum) {
  assert.ok(
    groups.comingSoon.some((tool) => tool.id === id),
    `Coming-soon launch group is missing ${id}`,
  );
}

assert.ok(
  groups.editorBackendFeatures.some(
    (definition) => definition.id === "translate",
  ),
  "Translate must remain classified as an editor backend feature",
);

const unavailableIds = new Set([
  ...groups.backendRequired.map((tool) => tool.id),
  ...groups.comingSoon.map((tool) => tool.id),
  ...groups.maintenanceOrDisabled.map((conversion) => conversion.id),
]);
for (const [surface, surfaceTools] of Object.entries(publicSurfaces)) {
  assert.deepEqual(
    surfaceTools.filter((tool) => unavailableIds.has(tool.id)),
    [],
    `${surface} leaks unavailable tools`,
  );
}

const guardedRoutes = [
  "word-to-pdf",
  "excel-to-pdf",
  "powerpoint-to-pdf",
  "heic-to-pdf",
  "webpage-to-pdf",
  "protect",
  "unlock",
  "watermark-remover",
  "redact",
];
const guardedRouteSources = await Promise.all(
  guardedRoutes.map((route) =>
    readFile(
      new URL(`../src/app/tools/${route}/page.tsx`, import.meta.url),
      "utf8",
    ),
  ),
);
for (const source of guardedRouteSources) {
  assert.match(source, /requirePublicLaunchReadyTool\(/);
}

const localRouteSources = await Promise.all(
  ["pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint"].map((route) =>
    readFile(
      new URL(`../src/app/tools/${route}/page.tsx`, import.meta.url),
      "utf8",
    ),
  ),
);
for (const source of localRouteSources) {
  assert.match(source, /PdfOfficeConversionPage/);
  assert.doesNotMatch(source, /ConversionCapabilityShell|requirePublicLaunchReadyTool/);
}

const homepageSource = await readFile(
  new URL("../src/app/page.tsx", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  homepageSource,
  /HomepageTrustStrip|ProductProof|WorkflowStories/,
);

function labels(items) {
  return items.map((item) => item.title ?? item.label ?? item.id);
}

console.log(
  JSON.stringify(
    {
      result: "passed",
      classifications: {
        publicWorking: labels(groups.publicWorking),
        backendRequired: labels(groups.backendRequired),
        comingSoon: labels(groups.comingSoon),
        maintenanceOrDisabled: labels(groups.maintenanceOrDisabled),
        editorBackendFeatures: labels(groups.editorBackendFeatures),
      },
      localBrowserConversions: [...LOCAL_BROWSER_CONVERSION_IDS],
      checkedSurfaces: Object.keys(publicSurfaces),
      guardedUnavailableRoutes: guardedRouteSources.length,
    },
    null,
    2,
  ),
);
