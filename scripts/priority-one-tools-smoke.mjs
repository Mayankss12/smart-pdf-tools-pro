import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getPublicConversionCapability } from "../src/lib/conversions/capabilities.ts";
import { getConversionById } from "../src/lib/conversions/registry.ts";
import { applyWatermark } from "../src/lib/pdf-watermark-engine.ts";
import {
  inspectRemovableWatermarks,
  removeCompatibleWatermarks,
} from "../src/lib/pdf-watermark-removal-engine.ts";
import { getToolById } from "../src/lib/tools.ts";
import { translateWithBrowser } from "../src/lib/translation/browser.ts";

const sourcePdf = await PDFDocument.create();
const page = sourcePdf.addPage([420, 595]);
const font = await sourcePdf.embedFont(StandardFonts.Helvetica);
page.drawText("Original document content", {
  x: 48,
  y: 530,
  size: 18,
  font,
  color: rgb(0.08, 0.12, 0.2),
});
const sourceBytes = await sourcePdf.save();
const sourceFile = new File([sourceBytes], "priority-one-source.pdf", {
  type: "application/pdf",
});

const watermarked = await applyWatermark(sourceFile, {
  mode: "text",
  layout: "single",
  targetPages: [1],
  text: "AUTHORIZED TEST WATERMARK",
  fontSize: 34,
  opacity: 0.32,
  angle: -30,
  fontStyle: "bold",
  color: [0.45, 0.22, 0.75],
  position: { xPercent: 50, yPercent: 50 },
  tileGap: 220,
  imageFile: null,
  imageScale: 30,
});
const watermarkedFile = new File([watermarked.blob], watermarked.fileName, {
  type: "application/pdf",
});
const inspection = await inspectRemovableWatermarks(watermarkedFile);
assert.equal(inspection.pageCount, 1);
assert.equal(inspection.taggedContentBlocks, 1);
assert.equal(inspection.compatibleMarks, 1);

await assert.rejects(
  removeCompatibleWatermarks(watermarkedFile, { authorized: false }),
  /Confirm that you own this PDF/,
);
const removal = await removeCompatibleWatermarks(watermarkedFile, {
  authorized: true,
});
assert.equal(removal.removedMarks, 1);
assert.equal(removal.removedTaggedContentBlocks, 1);
const cleanedFile = new File([removal.result.blob], removal.result.fileName, {
  type: "application/pdf",
});
const cleanedInspection = await inspectRemovableWatermarks(cleanedFile);
assert.equal(cleanedInspection.compatibleMarks, 0);
assert.equal(
  (await PDFDocument.load(await removal.result.blob.arrayBuffer())).getPageCount(),
  1,
);

const annotatedPdf = await PDFDocument.create();
const annotatedPage = annotatedPdf.addPage([300, 300]);
const annotation = annotatedPdf.context.obj({
  Type: "Annot",
  Subtype: "Watermark",
  Rect: [20, 20, 280, 80],
  Contents: "Standard watermark annotation",
});
annotatedPage.node.addAnnot(annotatedPdf.context.register(annotation));
const annotatedBytes = await annotatedPdf.save();
const annotatedFile = new File([annotatedBytes], "annotation.pdf", {
  type: "application/pdf",
});
assert.equal((await inspectRemovableWatermarks(annotatedFile)).watermarkAnnotations, 1);
const annotationRemoval = await removeCompatibleWatermarks(annotatedFile, {
  authorized: true,
});
assert.equal(annotationRemoval.removedWatermarkAnnotations, 1);
assert.equal(
  (await inspectRemovableWatermarks(
    new File([annotationRemoval.result.blob], "annotation-cleaned.pdf", {
      type: "application/pdf",
    }),
  )).compatibleMarks,
  0,
);

const originalTranslator = globalThis.Translator;
const originalLanguageDetector = globalThis.LanguageDetector;
let translatedRequest = null;
globalThis.LanguageDetector = {
  async availability() {
    return "available";
  },
  async create() {
    return {
      async detect() {
        return [{ detectedLanguage: "en", confidence: 0.99 }];
      },
      destroy() {},
    };
  },
};
globalThis.Translator = {
  async availability() {
    return "available";
  },
  async create(options) {
    translatedRequest = options;
    return {
      async translate(text) {
        return `नमस्ते: ${text}`;
      },
      destroy() {},
    };
  },
};
try {
  const localTranslation = await translateWithBrowser({
    text: "Hello",
    targetLanguage: "hi",
  });
  assert.equal(localTranslation.translatedText, "नमस्ते: Hello");
  assert.equal(localTranslation.sourceLanguage, "en");
  assert.equal(translatedRequest.sourceLanguage, "en");
  assert.equal(translatedRequest.targetLanguage, "hi");
} finally {
  if (originalTranslator === undefined) delete globalThis.Translator;
  else globalThis.Translator = originalTranslator;
  if (originalLanguageDetector === undefined) delete globalThis.LanguageDetector;
  else globalThis.LanguageDetector = originalLanguageDetector;
}

const heic = getConversionById("heic-to-pdf");
const heicCapability = getPublicConversionCapability("heic-to-pdf");
assert.equal(heic?.status, "available");
assert.equal(heic?.processingMode, "client");
assert.equal(heic?.maxFileCount, 20);
assert.equal(heicCapability?.enabled, true);
assert.equal(heicCapability?.processingMode, "client");

const watermarkTool = getToolById("watermark-remover");
assert.equal(watermarkTool?.status, "working");
assert.equal(watermarkTool?.isClientOnly, true);
assert.equal(watermarkTool?.capabilities.needsBackendProcessing, false);

const heicRoute = await readFile(
  new URL("../src/app/tools/heic-to-pdf/page.tsx", import.meta.url),
  "utf8",
);
assert.match(heicRoute, /ImagesToPdfPage/);
assert.match(heicRoute, /source:\s*"heic"/);
assert.doesNotMatch(heicRoute, /ConversionCapabilityShell|requirePublicLaunchReadyTool/);

const editorPage = await readFile(
  new URL("../src/app/editor/page.tsx", import.meta.url),
  "utf8",
);
const smartTools = await readFile(
  new URL("../src/app/editor/components/EditorSmartToolsPanel.tsx", import.meta.url),
  "utf8",
);
assert.match(editorPage, /isBrowserTranslationApiAvailable/);
assert.match(editorPage, /browserTranslationAvailable/);
assert.match(smartTools, /translateWithBrowser/);
assert.match(smartTools, /providerTranslationConfigured/);
assert.match(smartTools, /fetch\("\/api\/translate"/);

const webpageRoute = await readFile(
  new URL("../src/app/tools/webpage-to-pdf/page.tsx", import.meta.url),
  "utf8",
);
assert.match(webpageRoute, /requirePublicLaunchReadyTool\("webpage-to-pdf"\)/);

console.log(
  JSON.stringify({
    heicBrowserConversion: "passed",
    onDeviceTranslationWithProviderFallback: "passed",
    taggedAndAnnotationWatermarkRoundTrip: "passed",
    browserTranslationApiContract: "passed",
    watermarkAuthorizationGuard: "passed",
    secureWebpageRendererGuard: "passed",
  }),
);
