import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as pdfjs from "pdfjs-dist";

import { createTextPdf } from "../src/lib/text-to-pdf-engine.ts";

const [latin, devanagari] = await Promise.all([
  readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
  readFile(
    new URL(
      "../public/fonts/NotoSansDevanagari-Regular.ttf",
      import.meta.url,
    ),
  ),
]);
const longWord = "LongUnbrokenWord".repeat(30);
const content = [
  "Plain ASCII text",
  "Café — “quote” •",
  "नमस्ते दुनिया",
  "你好",
  "Emoji 😀 fallback",
  longWord,
  ...Array.from({ length: 95 }, (_, index) => `Wrapped line ${index + 1}`),
].join("\n");

const result = await createTextPdf({
  text: content,
  title: "Unicode document",
  pageSize: { width: 360, height: 420 },
  font: "helvetica",
  fontSize: 12,
  lineHeight: 18,
  margin: 36,
  fontBytes: {
    latin: new Uint8Array(latin),
    devanagari: new Uint8Array(devanagari),
  },
});

assert.ok(result.pageCount > 1);
assert.ok(result.replacementCount >= 3);

const pdf = await pdfjs.getDocument({ data: result.bytes.slice() }).promise;
const extractedPages = [];
try {
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    try {
      const text = await page.getTextContent();
      extractedPages.push(
        text.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(""),
      );
    } finally {
      page.cleanup();
    }
  }
} finally {
  await pdf.destroy();
}

const extracted = extractedPages.join("\n");
assert.match(extracted, /Plain ASCII text/);
assert.match(extracted, /Café/);
assert.match(extracted, /quote/);
assert.match(extracted, /नमस्ते/);
for (const character of new Set("दुनिया")) {
  assert.ok(extracted.includes(character));
}
assert.doesNotMatch(extracted, /你好|😀/);
assert.match(extracted, /LongUnbrokenWord/);
assert.match(extracted, /Wrapped line 95/);

console.log(
  JSON.stringify({
    ascii: "passed",
    accentsAndPunctuation: "passed",
    devanagari: "passed",
    unsupportedChineseAndEmojiFallback: "passed",
    longWordWrapping: "passed",
    multiPageWrapping: "passed",
    selectableText: "passed",
  }),
);
