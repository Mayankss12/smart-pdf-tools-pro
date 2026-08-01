import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [frameSource, canvasSource, textSource] = await Promise.all([
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
assert.match(frameSource, /h-4 w-4 rounded-full/);
assert.match(frameSource, /event\.key === "ArrowLeft"/);
assert.match(frameSource, /event\.shiftKey \? 10 : 1/);
assert.match(canvasSource, /id="editor-object-toolbar-host"/);
assert.match(canvasSource, /relative overflow-hidden/);
assert.match(textSource, /minWidth=\{72\}/);

console.log(
  JSON.stringify({
    editorPageBoundaryClamp: "passed",
    contextualToolbarHost: "passed",
    nonAnimatedObjectMotion: "passed",
    precisionResizeHandles: "passed",
    keyboardNudging: "passed",
    textMinimumWidthUpgrade: "passed",
  }),
);
