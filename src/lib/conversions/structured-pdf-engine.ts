import { PDFDocument, rgb } from "pdf-lib";

import {
  drawUnicodeTextLine,
  embedUnicodeFonts,
  measureUnicodeText,
  sanitizeUnicodeText,
  type BundledUnicodeFontBytes,
  type EmbeddedUnicodeFonts,
} from "@/lib/pdf-unicode-fonts";

export type StructuredBlock =
  | {
      readonly kind: "heading";
      readonly level: 1 | 2 | 3;
      readonly text: string;
    }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "list"; readonly text: string; readonly ordered: boolean; readonly index: number }
  | { readonly kind: "quote"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "table-row"; readonly cells: readonly string[]; readonly header: boolean }
  | { readonly kind: "page-break" };

export interface StructuredPdfResult {
  readonly bytes: Uint8Array;
  readonly pageCount: number;
  readonly replacementCount: number;
  readonly blockCount: number;
}

function splitLongWord(
  word: string,
  maxWidth: number,
  fonts: EmbeddedUnicodeFonts,
  fontSize: number,
  bold: boolean,
  italic: boolean,
) {
  const parts: string[] = [];
  let current = "";
  for (const character of word) {
    const next = current + character;
    if (
      measureUnicodeText(next, fontSize, fonts, bold, italic) <= maxWidth
    ) {
      current = next;
    } else {
      if (current) parts.push(current);
      current = character;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function wrapLine(
  text: string,
  maxWidth: number,
  fonts: EmbeddedUnicodeFonts,
  fontSize: number,
  bold = false,
  italic = false,
) {
  if (!text.trim()) return [""];
  const output: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (
      measureUnicodeText(candidate, fontSize, fonts, bold, italic) <=
      maxWidth
    ) {
      current = candidate;
      continue;
    }
    if (current) output.push(current);
    current = "";
    if (
      measureUnicodeText(word, fontSize, fonts, bold, italic) > maxWidth
    ) {
      output.push(
        ...splitLongWord(
          word,
          maxWidth,
          fonts,
          fontSize,
          bold,
          italic,
        ),
      );
    } else {
      current = word;
    }
  }
  if (current) output.push(current);
  return output;
}

export function parseMarkdownBlocks(source: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let inCode = false;
  let codeLines: string[] = [];

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCode) {
        blocks.push({ kind: "code", text: codeLines.join("\n") });
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ kind: "page-break" });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level =
        heading[1].length === 1 ? 1 : heading[1].length === 2 ? 2 : 3;
      blocks.push({
        kind: "heading",
        level,
        text: stripMarkdownInline(heading[2]),
      });
      continue;
    }
    const ordered = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (ordered) {
      blocks.push({
        kind: "list",
        ordered: true,
        index: Number(ordered[1]),
        text: stripMarkdownInline(ordered[2]),
      });
      continue;
    }
    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (unordered) {
      blocks.push({
        kind: "list",
        ordered: false,
        index: 0,
        text: stripMarkdownInline(unordered[1]),
      });
      continue;
    }
    const quote = /^\s*>\s?(.+)$/.exec(line);
    if (quote) {
      blocks.push({
        kind: "quote",
        text: stripMarkdownInline(quote[1]),
      });
      continue;
    }
    if (/^\s*\|.+\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => stripMarkdownInline(cell.trim()));
      const separator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
      if (!separator) {
        const previous = blocks.at(-1);
        blocks.push({
          kind: "table-row",
          cells,
          header: previous?.kind !== "table-row",
        });
      }
      continue;
    }
    if (line.trim()) {
      blocks.push({
        kind: "paragraph",
        text: stripMarkdownInline(line),
      });
    }
  }
  if (codeLines.length) blocks.push({ kind: "code", text: codeLines.join("\n") });
  return blocks;
}

function stripMarkdownInline(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "[Image: $1]")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function elementText(element: Element) {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function parseSafeHtmlBlocks(source: string): StructuredBlock[] {
  if (typeof DOMParser === "undefined") {
    const sanitized = source
      .replace(
        /<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi,
        " ",
      )
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return [
      {
        kind: "paragraph",
        text: sanitized,
      },
    ];
  }
  const document = new DOMParser().parseFromString(source, "text/html");
  document
    .querySelectorAll(
      "script,style,iframe,object,embed,link,meta,base,form,video,audio",
    )
    .forEach((element) => element.remove());
  const blocks: StructuredBlock[] = [];

  for (const element of Array.from(document.body.children)) {
    const tag = element.tagName.toLowerCase();
    const text = elementText(element);
    if (!text && tag !== "hr") continue;
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      blocks.push({
        kind: "heading",
        level: tag === "h1" ? 1 : tag === "h2" ? 2 : 3,
        text,
      });
    } else if (tag === "blockquote") {
      blocks.push({ kind: "quote", text });
    } else if (tag === "pre" || tag === "code") {
      blocks.push({ kind: "code", text: element.textContent ?? "" });
    } else if (tag === "hr") {
      blocks.push({ kind: "page-break" });
    } else if (tag === "ul" || tag === "ol") {
      Array.from(element.querySelectorAll(":scope > li")).forEach(
        (item, index) => {
          blocks.push({
            kind: "list",
            text: elementText(item),
            ordered: tag === "ol",
            index: index + 1,
          });
        },
      );
    } else if (tag === "table") {
      Array.from(element.querySelectorAll("tr")).forEach((row, index) => {
        blocks.push({
          kind: "table-row",
          cells: Array.from(row.querySelectorAll("th,td")).map(elementText),
          header: index === 0 || row.querySelector("th") !== null,
        });
      });
    } else {
      blocks.push({ kind: "paragraph", text });
    }
  }
  return blocks;
}

export function detectCsvDelimiter(source: string) {
  const sample = source.split(/\r?\n/).slice(0, 10);
  const candidates = [",", ";", "\t", "|"] as const;
  return candidates
    .map((delimiter) => ({
      delimiter,
      score: sample.reduce(
        (sum, line) => sum + parseCsvLine(line, delimiter).length,
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score)[0]?.delimiter ?? ",";
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvBlocks(source: string): StructuredBlock[] {
  const delimiter = detectCsvDelimiter(source);
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line, index) => ({
      kind: "table-row" as const,
      cells: parseCsvLine(line, delimiter),
      header: index === 0,
    }));
}

function blockStyle(block: StructuredBlock) {
  if (block.kind === "heading") {
    return {
      size: block.level === 1 ? 24 : block.level === 2 ? 19 : 15,
      bold: true,
      italic: false,
      indent: 0,
      before: block.level === 1 ? 10 : 7,
      after: 7,
    };
  }
  if (block.kind === "quote") {
    return { size: 11, bold: false, italic: true, indent: 18, before: 4, after: 5 };
  }
  if (block.kind === "code") {
    return { size: 9, bold: false, italic: false, indent: 12, before: 4, after: 6 };
  }
  if (block.kind === "table-row") {
    return { size: 9, bold: block.header, italic: false, indent: 0, before: 2, after: 3 };
  }
  if (block.kind === "list") {
    return { size: 11, bold: false, italic: false, indent: 14, before: 1, after: 3 };
  }
  return { size: 11, bold: false, italic: false, indent: 0, before: 2, after: 6 };
}

function blockText(block: Exclude<StructuredBlock, { kind: "page-break" }>) {
  if (block.kind === "list") {
    return `${block.ordered ? `${block.index}.` : "•"} ${block.text}`;
  }
  if (block.kind === "quote") return `“${block.text}”`;
  if (block.kind === "table-row") return block.cells.join("  |  ");
  return block.text;
}

export async function createStructuredPdf(options: {
  readonly title: string;
  readonly blocks: readonly StructuredBlock[];
  readonly landscape?: boolean;
  readonly fontBytes?: BundledUnicodeFontBytes;
}) : Promise<StructuredPdfResult> {
  if (!options.blocks.length) throw new Error("No printable content was found.");
  const pdf = await PDFDocument.create();
  const fonts = await embedUnicodeFonts(
    pdf,
    "helvetica",
    options.fontBytes,
  );
  const pageSize: [number, number] = options.landscape
    ? [841.89, 595.28]
    : [595.28, 841.89];
  const margin = 48;
  const usableWidth = pageSize[0] - margin * 2;
  let page = pdf.addPage(pageSize);
  let cursorY = pageSize[1] - margin;
  let replacementCount = 0;

  pdf.setTitle(options.title || "PDFMantra document");
  pdf.setCreator("PDFMantra");
  pdf.setProducer("PDFMantra");

  const nextPage = () => {
    page = pdf.addPage(pageSize);
    cursorY = pageSize[1] - margin;
  };

  for (const block of options.blocks) {
    if (block.kind === "page-break") {
      nextPage();
      continue;
    }
    const style = blockStyle(block);
    const sanitized = sanitizeUnicodeText(
      blockText(block),
      fonts,
      style.bold,
    );
    replacementCount += sanitized.replacementCount;
    const maxWidth = usableWidth - style.indent;
    const rawLines =
      block.kind === "code" ? sanitized.text.split("\n") : [sanitized.text];
    const lines = rawLines.flatMap((line) =>
      wrapLine(
        line,
        maxWidth,
        fonts,
        style.size,
        style.bold,
        style.italic,
      ),
    );
    const lineHeight = style.size + 5;
    if (
      cursorY - style.before - lines.length * lineHeight <
      margin + 18
    ) {
      nextPage();
    }
    cursorY -= style.before;
    for (const line of lines) {
      if (cursorY < margin + 18) nextPage();
      drawUnicodeTextLine({
        page,
        text: line,
        x: margin + style.indent,
        y: cursorY,
        size: style.size,
        fonts,
        bold: style.bold,
        italic: style.italic,
        color:
          block.kind === "quote"
            ? rgb(0.32, 0.28, 0.45)
            : rgb(0.1, 0.11, 0.16),
      });
      cursorY -= lineHeight;
    }
    cursorY -= style.after;
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    const footer = `Page ${index + 1} of ${pages.length}`;
    drawUnicodeTextLine({
      page: current,
      text: footer,
      x: margin,
      y: 22,
      size: 8,
      fonts,
      color: rgb(0.45, 0.46, 0.52),
    });
  });

  return {
    bytes: await pdf.save({ useObjectStreams: true, addDefaultPage: false }),
    pageCount: pages.length,
    replacementCount,
    blockCount: options.blocks.length,
  };
}
