export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const sourceUrl = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;

    try {
      return await nextResolve(sourceUrl, context);
    } catch {
      return nextResolve(`${sourceUrl}.ts`, context);
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]sx?$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    throw error;
  }
}
