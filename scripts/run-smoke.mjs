const suites = ["launch-readiness.mjs"];

for (const suite of suites) {
  await import(`./${suite}`);
}

console.log(JSON.stringify({ smokeSuites: suites.length, result: "passed" }));
