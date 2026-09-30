import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  normalizeSiteUrl,
  resolveSiteUrl,
} from "../src/lib/site-url.ts";

assert.equal(normalizeSiteUrl("https://pdfmantra.example/"), "https://pdfmantra.example");
assert.equal(normalizeSiteUrl("pdfmantra.example"), "https://pdfmantra.example");
assert.equal(normalizeSiteUrl("http://localhost:3000"), "http://localhost:3000");
assert.equal(normalizeSiteUrl("http://pdfmantra.example"), null);
assert.equal(normalizeSiteUrl("https://pdfmantra.example/path"), null);
assert.equal(normalizeSiteUrl("https://user:password@pdfmantra.example"), null);

assert.equal(
  resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://pdfmantra.example/" }),
  "https://pdfmantra.example",
);
assert.equal(
  resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "pdfmantra.vercel.app" }),
  "https://pdfmantra.vercel.app",
);
assert.equal(resolveSiteUrl({}), "http://localhost:3000");
assert.throws(
  () => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://pdfmantra.example" }),
  /origin-only HTTPS URL/,
);

const [layout, sitemap, robots, auth, productionAcceptance] = await Promise.all(
  [
    "../src/app/layout.tsx",
    "../src/app/sitemap.ts",
    "../src/app/robots.ts",
    "../src/app/actions/auth.ts",
    "./workspace-production-acceptance.mjs",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

for (const source of [layout, sitemap, robots, auth]) {
  assert.match(source, /getSiteUrl/);
  assert.doesNotMatch(source, /smart-pdf-tools-pro\.vercel\.app/);
}

assert.match(layout, /metadataBase: new URL\(siteUrl\)/);
assert.match(sitemap, /getPublicSitemapTools/);
assert.match(robots, /sitemap: `\$\{siteUrl\}\/sitemap\.xml`/);
assert.match(auth, /new URL\("\/auth\/callback", getSiteUrl\(\)\)/);
assert.match(productionAcceptance, /process\.env\.NEXT_PUBLIC_SITE_URL/);
assert.doesNotMatch(productionAcceptance, /smart-pdf-tools-pro\.vercel\.app/);

console.log(
  JSON.stringify({
    domainReadiness: "passed",
    canonicalMetadata: "environment-driven",
    sitemapAndRobots: "environment-driven",
    authCallbacks: "environment-driven",
  }),
);
