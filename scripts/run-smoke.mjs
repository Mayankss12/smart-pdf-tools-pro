const suites = [
  "admin-console-smoke.mjs",
  "auth-ui-smoke.mjs",
  "auth-otp-smoke.mjs",
  "compression-smoke.mjs",
  "conversion-platform-smoke.mjs",
  "editor-administration-smoke.mjs",
  "editor-export-smoke.mjs",
  "editor-interaction-smoke.mjs",
  "editor-link-smoke.mjs",
  "existing-text-edit-smoke.mjs",
  "export-entitlement-smoke.mjs",
  "fill-sign-smoke.mjs",
  "fill-sign-selection-smoke.mjs",
  "homepage-smoke.mjs",
  "images-to-pdf-smoke.mjs",
  "launch-readiness.mjs",
  "office-conversions-smoke.mjs",
  "pdf-rebuild-safety-smoke.mjs",
  "pdf-to-images-smoke.mjs",
  "standalone-overlay-smoke.mjs",
  "text-to-pdf-unicode-smoke.mjs",
  "verified-bugs-smoke.mjs",
];

for (const suite of suites) {
  await import(`./${suite}`);
}

console.log(
  JSON.stringify({
    smokeSuites: suites.length,
    result: "passed",
  }),
);
