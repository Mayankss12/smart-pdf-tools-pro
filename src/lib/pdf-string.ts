import { PDFString } from "pdf-lib";

// PDFString.of keeps its argument as the raw body of a "(...)" literal, so an
// unescaped ")" ends the string early and the rest is parsed as PDF syntax.
// Escape the characters that are special inside a literal string. Meant for
// Latin-1 text such as URLs, ids and font operators; use PDFHexString.fromText
// for arbitrary Unicode.
export function escapePdfLiteral(value: string) {
  return value.replace(/[\\()\r\n]/g, (character) => {
    if (character === "\r") return "\\r";
    if (character === "\n") return "\\n";
    return `\\${character}`;
  });
}

export function pdfLiteralString(value: string) {
  return PDFString.of(escapePdfLiteral(value));
}
