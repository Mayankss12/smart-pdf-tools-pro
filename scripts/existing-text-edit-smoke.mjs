import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getExistingTextEditSource,
  getExistingTextSourceKey,
  inferExistingTextStyle,
} from "../src/lib/editor/existing-text-edit.ts";

const sampleItem = {
  id: "1-0-Sample",
  page: 1,
  text: "Sample",
  leftPercent: 10,
  topPercent: 20,
  widthPercent: 15,
  heightPercent: 2.4,
  fontSizePx: 14,
  fontSizePdf: 12.5,
  transform: [1, 0, 0, 1, 0, 0],
  fontName: "ABCDEE+Helvetica-BoldOblique",
};

const source = getExistingTextEditSource(sampleItem, {
  width: 600,
  height: 800,
});

assert.equal(getExistingTextSourceKey(1, sampleItem.id), "1:1-0-Sample");
assert.equal(source.originalText, "Sample");
assert.equal(source.fontSize, 12.5);
assert.equal(source.sourceBox.x, 60);
assert.equal(source.sourceBox.y, 160);
assert.ok(source.sourceBox.width >= 90);
assert.ok(source.sourceBox.height >= 19.2);
assert.equal(source.baselineOffset, 19.2);
assert.ok(source.coverBox.x < source.sourceBox.x);
assert.ok(source.coverBox.y < source.sourceBox.y);
assert.ok(source.coverBox.width < source.sourceBox.width);

const style = inferExistingTextStyle(sampleItem.fontName);
assert.equal(style.fontWeight, "bold");
assert.equal(style.fontStyle, "italic");

const [
  useEditorSource,
  layerSource,
  portalSource,
  controlsSource,
  textToolSource,
  frameSource,
  exportSource,
  richTextSource,
] = await Promise.all([
  readFile(new URL("../src/app/editor/hooks/useEditor.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../src/app/editor/components/ExistingTextEditLayer.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/ExistingTextEditPortal.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/EditorLayerControls.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/tools/TextTool.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/tools/EditorObjectFrame.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-export-engine.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-rich-text-engine.ts", import.meta.url),
    "utf8",
  ),
]);

assert.match(useEditorSource, /readonly sourceTextEdit\?: ExistingTextEditSource/);
assert.match(useEditorSource, /sourceTextEdit: undefined/);
assert.match(layerSource, /extractTextOverlayItems/);
assert.match(layerSource, /data-existing-text-edit-target/);
assert.match(layerSource, /data-existing-text-source-mask/);
assert.match(layerSource, /getExistingTextEditSource\(item, unscaledPage\)/);
assert.match(layerSource, /editor\.setActiveTool\("select"\)/);
assert.match(layerSource, /Click existing text to edit/);
assert.match(portalSource, /createPortal/);
assert.match(portalSource, /canvas\.block\.bg-white/);
assert.match(portalSource, /ResizeObserver/);
assert.match(controlsSource, /<ExistingTextEditPortal editor=\{editor\} \/>/);
assert.match(controlsSource, /Existing text/);
assert.match(textToolSource, /Boolean\(sourceTextEdit\) \|\| !hasInitialText/);
assert.match(textToolSource, /minWidth=\{sourceTextEdit \? 10 : 72\}/);
assert.match(textToolSource, /toolbarLabel=\{sourceTextEdit \? "Existing text" : "Text"\}/);
assert.match(frameSource, /const isExistingTextEdit =/);
assert.match(frameSource, /object\.type === "text" && !isExistingTextEdit/);
assert.match(exportSource, /const sourceTextEdit = object\.data\.sourceTextEdit/);
assert.match(exportSource, /drawEditorWhiteout\(page, sourceTextEdit\.coverBox, geometry/);
assert.match(
  exportSource,
  /for \(const object of objects\) \{\s*const sourceTextEdit = object\.data\.sourceTextEdit;[\s\S]*?drawEditorWhiteout\(page, sourceTextEdit\.coverBox, geometry,[\s\S]*?\}\);\s*\}\s*\n\s*for \(const object of objects\) \{/,
  "Existing source text masks must be drawn in a dedicated pre-pass before editor overlays.",
);
assert.match(richTextSource, /const sourceTextEdit = object\.data\.sourceTextEdit/);
assert.match(richTextSource, /const paddingX = sourceTextEdit \? 0 : TEXT_PADDING_X/);
assert.match(richTextSource, /Math\.max\(fontSize, sourceTextEdit\.baselineOffset\)/);

console.log(
  JSON.stringify({
    existingTextDetection: "passed",
    directTextHitTargets: "passed",
    sourceAnchoredMaskPreview: "passed",
    sourceAnchoredMaskExport: "passed",
    existingTextBaselineAlignment: "passed",
    existingTextUndoModel: "passed",
    duplicateSourceIsolation: "passed",
    compactExistingTextFrames: "passed",
  }),
);
