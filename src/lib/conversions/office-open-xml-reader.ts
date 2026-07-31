import { PdfEngineError } from "@/lib/pdf-engine";

export type OfficeInputFormat = "docx" | "xlsx" | "pptx";

export type OfficeTextResult = {
  readonly text: string;
  readonly sectionCount: number;
  readonly characterCount: number;
};

type ZipRecord = {
  readonly name: string;
  readonly compression: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localOffset: number;
};

type RawDeflateStreamConstructor = new (
  format: "deflate-raw",
) => TransformStream<Uint8Array, Uint8Array>;

const decoder = new TextDecoder("utf-8");

function findEndRecord(bytes: Uint8Array) {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  throw new PdfEngineError(
    "INVALID_FILE",
    "This Office file does not contain a valid ZIP directory.",
  );
}

function readZipRecords(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndRecord(bytes);
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const records = new Map<string, ZipRecord>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new PdfEngineError(
        "INVALID_FILE",
        "The Office ZIP directory is damaged.",
      );
    }
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    records.set(name, {
      name,
      compression,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return records;
}

function binaryBlob(bytes: Uint8Array) {
  return new Blob([bytes.slice().buffer]);
}

async function inflateRaw(bytes: Uint8Array) {
  const BrowserDecompressionStream = globalThis.DecompressionStream as unknown as
    | RawDeflateStreamConstructor
    | undefined;
  if (!BrowserDecompressionStream) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This browser cannot decompress Office documents. Please use a current Chrome, Edge, Firefox, or Safari version.",
    );
  }
  const stream = binaryBlob(bytes)
    .stream()
    .pipeThrough(new BrowserDecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(bytes: Uint8Array, record: ZipRecord) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(record.localOffset, true) !== 0x04034b50) {
    throw new PdfEngineError(
      "INVALID_FILE",
      `The Office entry ${record.name} is damaged.`,
    );
  }
  const nameLength = view.getUint16(record.localOffset + 26, true);
  const extraLength = view.getUint16(record.localOffset + 28, true);
  const dataOffset = record.localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.subarray(
    dataOffset,
    dataOffset + record.compressedSize,
  );
  if (record.compression === 0) return compressed.slice();
  if (record.compression === 8) {
    const output = await inflateRaw(compressed);
    if (record.uncompressedSize && output.length !== record.uncompressedSize) {
      throw new PdfEngineError(
        "INVALID_FILE",
        `The Office entry ${record.name} has an invalid size.`,
      );
    }
    return output;
  }
  throw new PdfEngineError(
    "PROCESSING_FAILED",
    `The Office file uses unsupported ZIP compression method ${record.compression}.`,
  );
}

function parseXml(bytes: Uint8Array, label: string) {
  const document = new DOMParser().parseFromString(
    decoder.decode(bytes),
    "application/xml",
  );
  if (document.getElementsByTagName("parsererror").length) {
    throw new PdfEngineError("INVALID_FILE", `${label} XML is damaged.`);
  }
  return document;
}

function sortNumberedPaths(paths: readonly string[]) {
  return [...paths].sort((left, right) => {
    const leftNumber = Number(left.match(/(\d+)\.xml$/)?.[1] ?? 0);
    const rightNumber = Number(right.match(/(\d+)\.xml$/)?.[1] ?? 0);
    return leftNumber - rightNumber;
  });
}

async function extractDocx(
  bytes: Uint8Array,
  records: ReadonlyMap<string, ZipRecord>,
) {
  const record = records.get("word/document.xml");
  if (!record) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "This DOCX has no word/document.xml part.",
    );
  }
  const document = parseXml(
    await readZipEntry(bytes, record),
    "Word document",
  );
  const wordNamespace =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = Array.from(
    document.getElementsByTagNameNS(wordNamespace, "p"),
  );
  return paragraphs
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS(wordNamespace, "t"))
        .map((node) => node.textContent ?? "")
        .join(""),
    )
    .join("\n")
    .trim();
}

async function getSharedStrings(
  bytes: Uint8Array,
  records: ReadonlyMap<string, ZipRecord>,
) {
  const record = records.get("xl/sharedStrings.xml");
  if (!record) return [] as string[];
  const document = parseXml(
    await readZipEntry(bytes, record),
    "Excel shared strings",
  );
  const namespace =
    "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  return Array.from(document.getElementsByTagNameNS(namespace, "si")).map(
    (item) =>
      Array.from(item.getElementsByTagNameNS(namespace, "t"))
        .map((node) => node.textContent ?? "")
        .join(""),
  );
}

async function extractXlsx(
  bytes: Uint8Array,
  records: ReadonlyMap<string, ZipRecord>,
) {
  const namespace =
    "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const sharedStrings = await getSharedStrings(bytes, records);
  const sheetPaths = sortNumberedPaths(
    [...records.keys()].filter((path) =>
      /^xl\/worksheets\/sheet\d+\.xml$/.test(path),
    ),
  );
  if (!sheetPaths.length) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "This XLSX contains no worksheets.",
    );
  }
  const sections: string[] = [];
  for (let sheetIndex = 0; sheetIndex < sheetPaths.length; sheetIndex += 1) {
    const record = records.get(sheetPaths[sheetIndex]);
    if (!record) continue;
    const document = parseXml(
      await readZipEntry(bytes, record),
      `Excel sheet ${sheetIndex + 1}`,
    );
    const rows = Array.from(
      document.getElementsByTagNameNS(namespace, "row"),
    );
    const lines = rows.map((row) => {
      const cells = Array.from(
        row.getElementsByTagNameNS(namespace, "c"),
      );
      return cells
        .map((cell) => {
          const type = cell.getAttribute("t");
          if (type === "inlineStr") {
            return Array.from(
              cell.getElementsByTagNameNS(namespace, "t"),
            )
              .map((node) => node.textContent ?? "")
              .join("");
          }
          const raw =
            cell.getElementsByTagNameNS(namespace, "v")[0]?.textContent ?? "";
          if (type === "s") return sharedStrings[Number(raw)] ?? "";
          if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
          return raw;
        })
        .join("\t")
        .replace(/\s+$/g, "");
    });
    sections.push(
      `Worksheet ${sheetIndex + 1}\n${lines.join("\n")}`.trim(),
    );
  }
  return sections.join("\f");
}

async function extractPptx(
  bytes: Uint8Array,
  records: ReadonlyMap<string, ZipRecord>,
) {
  const drawingNamespace =
    "http://schemas.openxmlformats.org/drawingml/2006/main";
  const slidePaths = sortNumberedPaths(
    [...records.keys()].filter((path) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(path),
    ),
  );
  if (!slidePaths.length) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "This PPTX contains no slides.",
    );
  }
  const sections: string[] = [];
  for (let slideIndex = 0; slideIndex < slidePaths.length; slideIndex += 1) {
    const record = records.get(slidePaths[slideIndex]);
    if (!record) continue;
    const document = parseXml(
      await readZipEntry(bytes, record),
      `PowerPoint slide ${slideIndex + 1}`,
    );
    const paragraphs = Array.from(
      document.getElementsByTagNameNS(drawingNamespace, "p"),
    );
    const lines = paragraphs
      .map((paragraph) =>
        Array.from(
          paragraph.getElementsByTagNameNS(drawingNamespace, "t"),
        )
          .map((node) => node.textContent ?? "")
          .join(""),
      )
      .filter(Boolean);
    sections.push(`Slide ${slideIndex + 1}\n${lines.join("\n")}`.trim());
  }
  return sections.join("\f");
}

export async function extractOfficeText(
  file: File,
  format: OfficeInputFormat,
): Promise<OfficeTextResult> {
  if (file.size > 60 * 1024 * 1024) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "Office files are limited to 60 MB for browser conversion.",
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "This is not a valid Office Open XML package.",
    );
  }
  const records = readZipRecords(bytes);
  if ([...records.keys()].some((path) => /vbaProject\.bin$/i.test(path))) {
    throw new PdfEngineError(
      "INVALID_FILE",
      "Macro-enabled Office documents are not supported.",
    );
  }
  const text =
    format === "docx"
      ? await extractDocx(bytes, records)
      : format === "xlsx"
        ? await extractXlsx(bytes, records)
        : await extractPptx(bytes, records);
  if (!text.trim()) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      `No readable text was found in this ${format.toUpperCase()} file. Image-only content cannot yet be reconstructed locally.`,
    );
  }
  return {
    text,
    sectionCount: text.split("\f").length,
    characterCount: text.length,
  };
}
