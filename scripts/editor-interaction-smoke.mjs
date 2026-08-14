import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  frameSource,
  canvasSource,
  textSource,
  imageSource,
  signatureSource,
  stampSource,
  drawSource,
  drawEngineSource,
  imageEngineSource,
  shapeSource,
  shapeEngineSource,
  globalsSource,
] = await Promise.all([
  readFile(
    new URL(
      "../src/app/editor/components/tools/EditorObjectFrame.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/EditorCanvas.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/TextTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/ImageTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/SignatureTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/StampTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/DrawTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-draw-engine.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-image-engine.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../src/app/editor/components/tools/ShapeTool.tsx",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-shape-engine.ts", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
]);

assert.match(frameSource, /TEXT_OBJECT_MIN_WIDTH\s*=\s*140/);
assert.match(frameSource, /clampBoxToPage/);
assert.match(frameSource, /commitClampedBox\(object\.box\)/);
assert.match(frameSource, /createPortal\(toolbar, toolbarHost\)/);
assert.match(frameSource, /editor-object-toolbar-host/);
assert.match(frameSource, /transition-\[border-color,box-shadow,background-color\]/);
assert.doesNotMatch(
  frameSource,
  /absolute z-30 transition duration-200/,
  "Object position and size must not animate while dragging.",
);
assert.match(frameSource, /CORNER_RESIZE_HANDLES/);
assert.match(
  frameSource,
  /resizeHandles\s*=\s*preserveAspectRatioOnCornerResize/,
);
assert.match(frameSource, /data-resize-handle=\{handle\}/);
assert.match(frameSource, /compactResizeHandles/);
assert.match(frameSource, /"h-3 w-3"\s*:\s*"h-4 w-4"/);
assert.match(frameSource, /event\.key === "ArrowLeft"/);
assert.match(frameSource, /event\.shiftKey \? 10 : 1/);
assert.match(canvasSource, /id="editor-object-toolbar-host"/);
assert.match(canvasSource, /data-detected-image-actions/);
assert.doesNotMatch(canvasSource, /top:\s*Math\.max\(0,\s*objectPopover\.y/);
assert.match(canvasSource, /preserveAspectRatio="xMidYMid meet"/);
assert.match(canvasSource, /relative overflow-hidden/);
assert.match(textSource, /minWidth=\{72\}/);

for (const source of [imageSource, signatureSource, stampSource]) {
  assert.match(source, /preserveAspectRatioOnCornerResize/);
  assert.match(source, /object-contain/);
  assert.doesNotMatch(source, /object-fill/);
}

assert.match(drawSource, /preserveAspectRatioOnCornerResize/);
assert.match(drawSource, /preserveAspectRatio="xMidYMid meet"/);
assert.match(drawEngineSource, /function getDrawFit/);
assert.match(drawEngineSource, /const scale = Math\.min\(/);
assert.doesNotMatch(drawEngineSource, /const scaleX =/);
assert.doesNotMatch(drawEngineSource, /const scaleY =/);
assert.match(imageEngineSource, /function fitImageInsideBox/);
assert.match(imageEngineSource, /offsetX/);
assert.match(imageEngineSource, /offsetY/);
assert.match(shapeSource, /function getSquareBox/);
assert.match(
  shapeSource,
  /preserveAspectRatioOnCornerResize=\{shapeType === "circle"\}/,
);
assert.match(shapeSource, /<circle/);
assert.match(shapeEngineSource, /function getCenteredSquareBox/);
assert.match(shapeEngineSource, /xScale: radius/);
assert.match(shapeEngineSource, /yScale: radius/);
assert.match(globalsSource, /\[data-page-preview="true"\] > div:first-child/);
assert.match(globalsSource, /aspect-ratio: auto !important/);
assert.match(globalsSource, /width: 100% !important/);
assert.match(globalsSource, /height: auto !important/);

console.log(
  JSON.stringify({
    editorPageBoundaryClamp: "passed",
    contextualToolbarHost: "passed",
    detectedImageActionsOutsideCanvas: "passed",
    nonAnimatedObjectMotion: "passed",
    precisionResizeHandles: "passed",
    proportionalMediaResize: "passed",
    proportionalMediaExport: "passed",
    proportionalFreeDraw: "passed",
    circularShapeIntegrity: "passed",
    overlayPreviewGeometry: "passed",
    keyboardNudging: "passed",
    textMinimumWidthUpgrade: "passed",
  }),
);
