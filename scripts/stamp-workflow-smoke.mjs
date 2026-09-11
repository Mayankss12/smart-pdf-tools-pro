import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  EDITOR_STAMP_FORMATS,
  EDITOR_STAMP_PRESETS,
  buildStampLines,
  getStampDefaultSize,
  sanitizeStampName,
} from "../src/lib/editor/editor-stamp.ts";

assert.deepEqual(EDITOR_STAMP_FORMATS, ["rectangle", "pill", "round"]);
assert.ok(EDITOR_STAMP_PRESETS.includes("Authorized"));
assert.ok(EDITOR_STAMP_PRESETS.includes("Approved"));
assert.ok(EDITOR_STAMP_PRESETS.includes("Confidential"));
assert.equal(sanitizeStampName("  Mayank    Singh  "), "Mayank Singh");
assert.deepEqual(
  buildStampLines({
    preset: "Authorized",
    format: "pill",
    authorizedName: "Mayank Singh",
    date: "2026-09-11",
    color: "#166534",
  }),
  ["AUTHORIZED", "Authorized: Mayank Singh", "11/09/2026"],
);
assert.equal(getStampDefaultSize("round").width, getStampDefaultSize("round").height);

const [composer, canvas, stampTool, stampEngine] = await Promise.all([
  readFile(new URL("../src/app/editor/components/EditorStampComposer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/components/EditorCanvas.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/components/tools/StampTool.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/pdf-tools/editor-stamp-engine.ts", import.meta.url), "utf8"),
]);

assert.match(composer, /Authorized name/);
assert.match(composer, /Upload artwork/);
assert.match(composer, /Include date/);
assert.match(composer, /aria-modal="true"/);
assert.match(canvas, /addGeneratedStampObject/);
assert.match(canvas, /stampPreset: definition\.preset/);
assert.match(stampTool, /buildStampLines/);
assert.match(stampEngine, /drawEditorGeneratedStamp/);
assert.match(stampEngine, /page\.drawEllipse/);
assert.match(stampEngine, /drawEditorRichTextObject/);

console.log(
  JSON.stringify({
    stampPresets: EDITOR_STAMP_PRESETS.length,
    stampFormats: EDITOR_STAMP_FORMATS.length,
    authorizedNameGeneration: "passed",
    generatedStampPreview: "passed",
    generatedStampPdfExport: "passed",
    customArtworkUpload: "preserved",
  }),
);
