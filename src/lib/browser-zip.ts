export type ZipFileInput = {
  fileName: string;
  blob: Blob;
};

const ZIP_MIME_TYPE = "application/zip";
const CRC_TABLE = new Uint32Array(256);

for (let index = 0; index < CRC_TABLE.length; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  CRC_TABLE[index] = value >>> 0;
}

function calculateCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createLittleEndianBytes(values: Array<{ value: number; bytes: 2 | 4 }>) {
  const totalBytes = values.reduce((sum, item) => sum + item.bytes, 0);
  const output = new Uint8Array(totalBytes);
  const view = new DataView(output.buffer);
  let offset = 0;

  for (const item of values) {
    if (item.bytes === 2) {
      view.setUint16(offset, item.value, true);
    } else {
      view.setUint32(offset, item.value, true);
    }

    offset += item.bytes;
  }

  return output;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

export function normalizeZipEntryName(fileName: string) {
  const cleanedName = fileName
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[\u0000-\u001f]/g, "").trim())
    .filter((part) => Boolean(part) && part !== "." && part !== "..")
    .join("/");

  return cleanedName || "file";
}

function getBlobPartSize(part: BlobPart) {
  if (typeof part === "string") return new TextEncoder().encode(part).byteLength;
  if (part instanceof ArrayBuffer) return part.byteLength;
  if (ArrayBuffer.isView(part)) return part.byteLength;
  if (part instanceof Blob) return part.size;
  return 0;
}

export async function createZipBlob(files: ZipFileInput[]) {
  if (files.length === 0) {
    return new Blob([], { type: ZIP_MIME_TYPE });
  }

  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const centralDirectoryParts: BlobPart[] = [];
  const { dosDate, dosTime } = getDosDateTime();
  let offset = 0;

  for (const file of files) {
    const safeName = normalizeZipEntryName(file.fileName);
    const nameBytes = encoder.encode(safeName);
    const fileBytes = new Uint8Array(await file.blob.arrayBuffer());
    const crc32 = calculateCrc32(fileBytes);
    const localHeaderOffset = offset;

    const localHeader = createLittleEndianBytes([
      { value: 0x04034b50, bytes: 4 },
      { value: 20, bytes: 2 },
      { value: 0x0800, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: dosTime, bytes: 2 },
      { value: dosDate, bytes: 2 },
      { value: crc32, bytes: 4 },
      { value: fileBytes.length, bytes: 4 },
      { value: fileBytes.length, bytes: 4 },
      { value: nameBytes.length, bytes: 2 },
      { value: 0, bytes: 2 },
    ]);

    parts.push(localHeader, nameBytes, fileBytes);
    offset += localHeader.length + nameBytes.length + fileBytes.length;

    const centralHeader = createLittleEndianBytes([
      { value: 0x02014b50, bytes: 4 },
      { value: 20, bytes: 2 },
      { value: 20, bytes: 2 },
      { value: 0x0800, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: dosTime, bytes: 2 },
      { value: dosDate, bytes: 2 },
      { value: crc32, bytes: 4 },
      { value: fileBytes.length, bytes: 4 },
      { value: fileBytes.length, bytes: 4 },
      { value: nameBytes.length, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: 0, bytes: 2 },
      { value: 0, bytes: 4 },
      { value: localHeaderOffset, bytes: 4 },
    ]);

    centralDirectoryParts.push(centralHeader, nameBytes);
  }

  const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + getBlobPartSize(part), 0);
  const centralDirectoryOffset = offset;

  const endOfCentralDirectory = createLittleEndianBytes([
    { value: 0x06054b50, bytes: 4 },
    { value: 0, bytes: 2 },
    { value: 0, bytes: 2 },
    { value: files.length, bytes: 2 },
    { value: files.length, bytes: 2 },
    { value: centralDirectorySize, bytes: 4 },
    { value: centralDirectoryOffset, bytes: 4 },
    { value: 0, bytes: 2 },
  ]);

  return new Blob([...parts, ...centralDirectoryParts, endOfCentralDirectory], {
    type: ZIP_MIME_TYPE,
  });
}
