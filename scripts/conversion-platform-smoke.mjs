import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument } from "pdf-lib";

import {
  CONVERSION_REGISTRY,
  getConversionsFromPdf,
  getConversionsToPdf,
} from "../src/lib/conversions/registry.ts";
import {
  validatePublicWebpageUrl,
  validateConversionFiles,
} from "../src/lib/conversions/security.ts";
import {
  assertSafeJobId,
  ConversionJobIdError,
  validateProviderOutput,
} from "../src/lib/conversions/jobs.ts";
import {
  PROVIDER_REQUEST_LIMIT_BYTES,
  PROVIDER_UPLOAD_FILE_LIMIT_BYTES,
  isWithinProviderUploadLimit,
} from "../src/lib/conversions/limits.ts";
import {
  getConversionPollDelay,
  isTransientPollStatus,
} from "../src/lib/conversions/polling.ts";
import { validateAndResolvePublicWebpageUrl } from "../src/lib/conversions/webpage-security.server.ts";
import { canUseToolByTier } from "../src/lib/entitlements.ts";
import {
  createPlainTextOutput,
  createSafeHtmlOutput,
} from "../src/lib/conversions/pdf-text-engine.ts";
import {
  createStructuredPdf,
  detectCsvDelimiter,
  parseCsvBlocks,
  parseMarkdownBlocks,
  parseSafeHtmlBlocks,
} from "../src/lib/conversions/structured-pdf-engine.ts";

const routes = CONVERSION_REGISTRY.map((conversion) => conversion.route);
assert.equal(new Set(routes).size, routes.length);
assert.equal(CONVERSION_REGISTRY.length, 23);
assert.ok(getConversionsFromPdf().length >= 9);
assert.ok(getConversionsToPdf().length >= 10);
const toolsSource = await readFile(
  join(process.cwd(), "src/lib/tools.ts"),
  "utf8",
);
assert.doesNotMatch(toolsSource, /id:\s*"pdf-to-word"/);
assert.doesNotMatch(toolsSource, /id:\s*"images-to-pdf"/);
for (const conversion of CONVERSION_REGISTRY) {
  assert.ok(conversion.id);
  assert.ok(conversion.entitlementToolKey);
  assert.ok(conversion.analyticsEvent.startsWith("conversion_"));
  assert.ok(conversion.maxFileSize >= 0);
  if (conversion.status === "backend-required") {
    assert.ok(conversion.disabledReason);
  }
  await access(
    join(
      process.cwd(),
      "src/app",
      conversion.route,
      "page.tsx",
    ),
  );
}
assert.equal(
  canUseToolByTier({ tier: "guest", toolKey: "pdf-to-text" }),
  true,
);
assert.equal(
  canUseToolByTier({ tier: "free", toolKey: "pdf-to-word" }),
  false,
);
assert.equal(
  canUseToolByTier({ tier: "pro", toolKey: "pdf-to-word" }),
  true,
);

assert.equal(validatePublicWebpageUrl("file:///etc/passwd").allowed, false);
assert.equal(validatePublicWebpageUrl("http://[::1]/").allowed, false);
assert.equal(validatePublicWebpageUrl("http://[fc00::1]/").allowed, false);
assert.equal(validatePublicWebpageUrl("http://[fe80::1]/").allowed, false);
assert.equal(validatePublicWebpageUrl("http://[::ffff:127.0.0.1]/").allowed, false);
assert.equal(validatePublicWebpageUrl("http://[::ffff:10.0.0.1]/").allowed, false);
assert.equal(validatePublicWebpageUrl("http://127.0.0.1/admin").allowed, false);
assert.equal(validatePublicWebpageUrl("http://10.0.0.1").allowed, false);
assert.equal(validatePublicWebpageUrl("http://172.16.0.1").allowed, false);
assert.equal(validatePublicWebpageUrl("http://192.168.1.2").allowed, false);
assert.equal(validatePublicWebpageUrl("http://2130706433").allowed, false);
assert.equal(validatePublicWebpageUrl("http://0x7f000001").allowed, false);
assert.equal(validatePublicWebpageUrl("https://example.com").allowed, true);
assert.throws(
  () => assertSafeJobId("../../unsafe"),
  (error) =>
    error instanceof ConversionJobIdError &&
    error.code === "INVALID_JOB_ID",
);
assert.doesNotThrow(() => assertSafeJobId("job_12345678"));

const privateDns = await validateAndResolvePublicWebpageUrl(
  "https://private.example",
  { resolver: async () => ["10.0.0.2"] },
);
assert.equal(privateDns.allowed, false);
const publicDns = await validateAndResolvePublicWebpageUrl(
  "https://public.example/path",
  { resolver: async () => ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"] },
);
assert.equal(publicDns.allowed, true);
if (publicDns.allowed) {
  assert.equal(publicDns.policy.dnsPinningRequired, true);
  assert.equal(publicDns.policy.redirectRevalidationRequired, true);
  assert.equal(publicDns.policy.maxRedirects, 5);
  assert.deepEqual(publicDns.policy.pinnedAddresses, [
    "93.184.216.34",
    "2606:2800:220:1:248:1893:25c8:1946",
  ]);
}
assert.equal(
  PROVIDER_REQUEST_LIMIT_BYTES - PROVIDER_UPLOAD_FILE_LIMIT_BYTES,
  1024 * 1024,
);
assert.equal(isWithinProviderUploadLimit(PROVIDER_UPLOAD_FILE_LIMIT_BYTES), true);
assert.equal(isWithinProviderUploadLimit(PROVIDER_UPLOAD_FILE_LIMIT_BYTES + 1), false);
assert.equal(getConversionPollDelay(0, 0), 1500);
assert.ok(getConversionPollDelay(20, 1) <= 15_000);
assert.equal(isTransientPollStatus(503), true);
assert.equal(isTransientPollStatus(401), false);

const webpageConversion = CONVERSION_REGISTRY.find(
  (conversion) => conversion.id === "webpage-to-pdf",
);
assert.ok(webpageConversion);
assert.doesNotThrow(() =>
  validateProviderOutput(webpageConversion, {
    body: Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer,
    mimeType: "application/pdf",
    fileName: "page.pdf",
  }),
);
assert.throws(() =>
  validateProviderOutput(webpageConversion, {
    body: Uint8Array.from([1, 2, 3]).buffer,
    mimeType: "application/pdf",
    fileName: "page.pdf",
  }),
);

const pdfConversion = CONVERSION_REGISTRY.find(
  (conversion) => conversion.id === "pdf-to-text",
);
assert.ok(pdfConversion);
await assert.rejects(
  validateConversionFiles(
    pdfConversion,
    [new File(["not-pdf"], "fake.pdf", { type: "application/pdf" })],
  ),
  /valid PDF signature/,
);

const heicConversion = CONVERSION_REGISTRY.find(
  (conversion) => conversion.id === "heic-to-pdf",
);
assert.ok(heicConversion);
await assert.rejects(
  validateConversionFiles(heicConversion, [
    new File(["not-heic"], "fake.heic", { type: "image/heic" }),
  ]),
  /recognized HEIC/,
);

const wordConversion = CONVERSION_REGISTRY.find(
  (conversion) => conversion.id === "docx-to-pdf",
);
assert.ok(wordConversion);
const officeMime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const officeHeader = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);
await assert.doesNotReject(
  validateConversionFiles(wordConversion, [
    new File(
      [officeHeader, "[Content_Types].xml word/document.xml"],
      "valid.docx",
      { type: officeMime },
    ),
  ]),
);
await assert.rejects(
  validateConversionFiles(wordConversion, [
    new File(
      [
        officeHeader,
        "[Content_Types].xml word/document.xml word/vbaProject.bin",
      ],
      "macro.docx",
      { type: officeMime },
    ),
  ]),
  /VBA projects/,
);

const extracted = {
  pages: [
    {
      pageNumber: 1,
      usedOcr: false,
      lines: [
        { text: "Café — quote", fontSize: 18, direction: "ltr" },
        { text: "नमस्ते", fontSize: 12, direction: "ltr" },
      ],
    },
    {
      pageNumber: 2,
      usedOcr: true,
      lines: [{ text: "Second page", fontSize: 12, direction: "ltr" }],
    },
  ],
  pageCount: 2,
  ocrPageCount: 1,
};
assert.match(createPlainTextOutput(extracted, "heading"), /--- Page 2 ---/);
const html = createSafeHtmlOutput(extracted, "layout");
assert.match(html, /Content-Security-Policy/);
assert.doesNotMatch(html, /<script/);
assert.match(html, /data-page="2"/);

const markdown = parseMarkdownBlocks(
  "# Heading\n\n- Item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nalert('text only')\n```",
);
assert.ok(markdown.some((block) => block.kind === "heading"));
assert.ok(markdown.some((block) => block.kind === "table-row"));
assert.ok(markdown.some((block) => block.kind === "code"));

const safeHtmlBlocks = parseSafeHtmlBlocks(
  "<h1>Safe</h1><script>danger()</script><p>Body</p>",
);
assert.equal(
  safeHtmlBlocks.some(
    (block) => "text" in block && block.text.includes("danger"),
  ),
  false,
);
assert.equal(detectCsvDelimiter("a;b;c\n1;2;3"), ";");
assert.equal(parseCsvBlocks("a,b\n1,2").length, 2);

const fontBytes = {
  latin: new Uint8Array(
    await readFile(join(process.cwd(), "public/fonts/NotoSans-Regular.ttf")),
  ),
  devanagari: new Uint8Array(
    await readFile(
      join(process.cwd(), "public/fonts/NotoSansDevanagari-Regular.ttf"),
    ),
  ),
};
const structured = await createStructuredPdf({
  title: "Structured smoke",
  blocks: [
    { kind: "heading", level: 1, text: "Unicode Café" },
    { kind: "paragraph", text: "नमस्ते दुनिया" },
    { kind: "table-row", header: true, cells: ["Name", "Value"] },
    { kind: "table-row", header: false, cells: ["Alpha", "42"] },
    { kind: "page-break" },
    { kind: "quote", text: "Second page" },
  ],
  fontBytes,
});
const outputPdf = await PDFDocument.load(structured.bytes);
assert.equal(outputPdf.getPageCount(), 2);

console.log(
  JSON.stringify({
    registryDefinitions: CONVERSION_REGISTRY.length,
    canonicalCatalogSource: "passed",
    uniqueRoutes: "passed",
    routeCoverage: "passed",
    backendBlockers: "passed",
    magicBytes: "passed",
    heicSignature: "passed",
    officeStructureAndMacroBlock: "passed",
    ssrfValidation: "passed",
    dnsAndRedirectContract: "passed",
    canonicalProviderUploadLimit: "passed",
    pollingBackoff: "passed",
    providerOutputValidation: "passed",
    pdfTextAndHtml: "passed",
    markdownHtmlCsvParsing: "passed",
    structuredUnicodePdf: "passed",
    jobIdValidation: "passed",
    entitlementClassification: "passed",
  }),
);
