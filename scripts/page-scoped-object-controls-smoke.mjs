import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [editorState, fillSign, formCreator, editorCanvas] = await Promise.all([
  read("../src/app/editor/hooks/useEditor.ts"),
  read("../src/app/tools/fill-sign/page.tsx"),
  read("../src/components/PdfFormCreatorClient.tsx"),
  read("../src/app/editor/components/EditorCanvas.tsx"),
]);

assert.match(
  editorState,
  /object\.id === selectedObjectId\s*&&\s*object\.pageNumber === activePageNumber/,
);
assert.match(editorState, /setActivePageNumber\(clamp[\s\S]*?setSelectedObjectId\(null\)/);

assert.match(
  fillSign,
  /object\.id === selectedObjectId\s*&&\s*object\.pageNumber === activePageNumber/,
);
assert.match(
  fillSign,
  /function selectPage\(pageNumber: number\)[\s\S]*?setSelectedObjectId\(null\)[\s\S]*?dragStateRef\.current = null/,
);
assert.doesNotMatch(fillSign, /className="fixed bottom-4 left-1\/2 z-50/);

assert.match(
  formCreator,
  /field\.id === selectedId && field\.pageNumber === pageNumber/,
);
assert.match(
  formCreator,
  /useEffect\(\(\) => \{\s*setSelectedId\(null\);\s*setDraft\(null\);\s*\}, \[pageNumber\]\)/,
);
assert.match(formCreator, /bg-transparent/);
assert.match(editorCanvas, /editor-object-toolbar-host/);

console.log(
  JSON.stringify({
    editorSelectionPageScope: "passed",
    fillSignSelectionPageScope: "passed",
    formCreatorSelectionPageScope: "passed",
    floatingControlsRemoved: "passed",
    formFieldPaperTransparency: "passed",
  }),
);
