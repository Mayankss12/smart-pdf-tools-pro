const suites = [
  "images-to-pdf-smoke.mjs",
  "launch-readiness.mjs",
  "office-conversions-smoke.mjs",
  "pdf-rebuild-safety-smoke.mjs",
];

for (const suite of suites) {
  await import(`./${suite}`);
}

console.log(JSON.stringify({ smokeSuites: suites.length, result: "passed" }));
