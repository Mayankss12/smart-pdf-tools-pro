const suites = [
  "auth-ui-smoke.mjs",
  "compression-smoke.mjs",
  "conversion-platform-smoke.mjs",
  "editor-administration-smoke.mjs",
  "editor-export-smoke.mjs",
  "export-entitlement-smoke.mjs",
  "fill-sign-smoke.mjs",
  "homepage-smoke.mjs",
];

for (const suite of suites) {
  await import(`./${suite}`);
}

console.log(JSON.stringify({ smokeSuites: suites.length, result: "passed" }));
