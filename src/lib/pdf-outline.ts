import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFRef,
  PDFString,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from "pdf-lib";

// Bookmarks (the document outline) live in the catalog, not on pages, so
// pdf-lib's copyPages drops them. These helpers read a source outline and
// rebuild it in the output, pointing each bookmark at the copied page.

type PdfOutlineNode = {
  readonly title: string;
  readonly pageIndex: number | null;
  readonly view: readonly PDFObject[];
  readonly open: boolean;
  readonly color: readonly number[] | null;
  readonly flags: number | null;
  readonly children: readonly PdfOutlineNode[];
};

type MappedOutlineNode = Omit<PdfOutlineNode, "children" | "pageIndex"> & {
  readonly pageRef: PDFRef | null;
  readonly children: readonly MappedOutlineNode[];
};

export type PdfOutlineCopySource = {
  readonly source: PDFDocument;
  // Source page indices in the order they were copied.
  readonly sourcePageIndices: readonly number[];
  // The pages copyPages returned for those indices, already added to the output.
  readonly copiedPages: readonly PDFPage[];
};

const MAX_OUTLINE_ITEMS = 10_000;
const MAX_NAME_TREE_DEPTH = 32;

function decodeText(value: PDFObject | undefined) {
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return value.decodeText();
  }
  return "";
}

function findInNameTree(
  node: PDFDict | undefined,
  key: string,
  depth = 0,
): PDFObject | undefined {
  if (!node || depth > MAX_NAME_TREE_DEPTH) return undefined;

  const names = node.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (names) {
    for (let index = 0; index + 1 < names.size(); index += 2) {
      if (decodeText(names.lookup(index)) === key) return names.lookup(index + 1);
    }
  }

  const kids = node.lookupMaybe(PDFName.of("Kids"), PDFArray);
  if (!kids) return undefined;

  for (let index = 0; index < kids.size(); index += 1) {
    const found = findInNameTree(kids.lookupMaybe(index, PDFDict), key, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function resolveNamedDestination(document: PDFDocument, destination: PDFObject) {
  const catalog = document.catalog;
  let resolved: PDFObject | undefined;

  if (destination instanceof PDFName) {
    resolved = catalog
      .lookupMaybe(PDFName.of("Dests"), PDFDict)
      ?.lookup(destination);
  } else {
    const key = decodeText(destination);
    if (!key) return undefined;
    const names = catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    resolved = findInNameTree(names?.lookupMaybe(PDFName.of("Dests"), PDFDict), key);
  }

  return resolved instanceof PDFDict ? resolved.lookup(PDFName.of("D")) : resolved;
}

function readDestination(
  document: PDFDocument,
  item: PDFDict,
  pageIndexByRef: ReadonlyMap<string, number>,
) {
  let destination = item.lookup(PDFName.of("Dest"));

  if (!destination) {
    const action = item.lookupMaybe(PDFName.of("A"), PDFDict);
    if (action?.lookup(PDFName.of("S")) === PDFName.of("GoTo")) {
      destination = action.lookup(PDFName.of("D"));
    }
  }

  if (destination && !(destination instanceof PDFArray)) {
    destination = resolveNamedDestination(document, destination);
  }

  if (!(destination instanceof PDFArray) || destination.size() === 0) {
    return { pageIndex: null, view: [] };
  }

  const pageRef = destination.get(0);
  const pageIndex = pageRef instanceof PDFRef
    ? pageIndexByRef.get(pageRef.toString()) ?? null
    : null;
  // View parameters (/XYZ left top zoom, /Fit, ...) are plain values that stay
  // valid because copied pages keep their coordinate space.
  const view = destination
    .asArray()
    .slice(1)
    .map((value) =>
      value instanceof PDFName || value instanceof PDFNumber ? value : PDFNull,
    );

  return { pageIndex, view };
}

function readColor(item: PDFDict) {
  const color = item.lookupMaybe(PDFName.of("C"), PDFArray);
  if (!color || color.size() !== 3) return null;

  const values = color.asArray().map((value) =>
    value instanceof PDFNumber ? value.asNumber() : Number.NaN,
  );
  return values.every(Number.isFinite) ? values : null;
}

function readPdfOutline(document: PDFDocument): PdfOutlineNode[] {
  const root = document.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict);
  if (!root) return [];

  const pageIndexByRef = new Map(
    document.getPages().map((page, index) => [page.ref.toString(), index]),
  );
  const visited = new Set<string>();

  function readSiblings(parent: PDFDict): PdfOutlineNode[] {
    const nodes: PdfOutlineNode[] = [];
    let ref = parent.get(PDFName.of("First"));

    while (ref instanceof PDFRef && !visited.has(ref.toString())) {
      if (visited.size >= MAX_OUTLINE_ITEMS) break;
      visited.add(ref.toString());

      const item = document.context.lookupMaybe(ref, PDFDict);
      if (!item) break;

      const count = item.lookupMaybe(PDFName.of("Count"), PDFNumber)?.asNumber() ?? 0;
      const flags = item.lookupMaybe(PDFName.of("F"), PDFNumber)?.asNumber() ?? null;

      nodes.push({
        title: decodeText(item.lookup(PDFName.of("Title"))),
        ...readDestination(document, item, pageIndexByRef),
        open: count > 0,
        color: readColor(item),
        flags,
        children: readSiblings(item),
      });

      ref = item.get(PDFName.of("Next"));
    }

    return nodes;
  }

  return readSiblings(root);
}

function mapOutline(
  nodes: readonly PdfOutlineNode[],
  pageRefBySourceIndex: ReadonlyMap<number, PDFRef>,
): MappedOutlineNode[] {
  return nodes.flatMap((node) => {
    const children = mapOutline(node.children, pageRefBySourceIndex);
    const pageRef = node.pageIndex === null
      ? null
      : pageRefBySourceIndex.get(node.pageIndex) ?? null;

    // Drop bookmarks whose page was not copied, unless they still group others.
    if (!pageRef && children.length === 0) return [];

    return [{ ...node, pageRef, children }];
  });
}

function getVisibleCount(nodes: readonly MappedOutlineNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + (node.open ? getVisibleCount(node.children) : 0),
    0,
  );
}

function writeOutlineItems(
  destination: PDFDocument,
  nodes: readonly MappedOutlineNode[],
  parentRef: PDFRef,
) {
  const context = destination.context;
  const refs = nodes.map(() => context.nextRef());

  nodes.forEach((node, index) => {
    const item = context.obj({
      Title: PDFHexString.fromText(node.title),
      Parent: parentRef,
    });

    if (index > 0) item.set(PDFName.of("Prev"), refs[index - 1]);
    if (index < nodes.length - 1) item.set(PDFName.of("Next"), refs[index + 1]);
    if (node.pageRef) {
      item.set(
        PDFName.of("Dest"),
        context.obj([node.pageRef, ...(node.view.length ? node.view : [PDFName.of("Fit")])]),
      );
    }
    if (node.color) item.set(PDFName.of("C"), context.obj([...node.color]));
    if (node.flags) item.set(PDFName.of("F"), PDFNumber.of(node.flags));

    if (node.children.length) {
      const children = writeOutlineItems(destination, node.children, refs[index]);
      item.set(PDFName.of("First"), children.first);
      item.set(PDFName.of("Last"), children.last);
      item.set(
        PDFName.of("Count"),
        PDFNumber.of(node.open ? getVisibleCount(node.children) : -node.children.length),
      );
    }

    context.assign(refs[index], item);
  });

  return { first: refs[0], last: refs[refs.length - 1] };
}

// Rebuilds the bookmarks of every source in the output, in source order.
// Returns the number of top-level bookmarks written.
export function copyPdfOutlines(
  destination: PDFDocument,
  sources: readonly PdfOutlineCopySource[],
) {
  const nodes = sources.flatMap(({ source, sourcePageIndices, copiedPages }) => {
    const pageRefBySourceIndex = new Map<number, PDFRef>();
    sourcePageIndices.forEach((sourceIndex, position) => {
      const page = copiedPages[position];
      if (page && !pageRefBySourceIndex.has(sourceIndex)) {
        pageRefBySourceIndex.set(sourceIndex, page.ref);
      }
    });

    return mapOutline(readPdfOutline(source), pageRefBySourceIndex);
  });

  if (nodes.length === 0) return 0;

  const context = destination.context;
  const rootRef = context.nextRef();
  const items = writeOutlineItems(destination, nodes, rootRef);

  context.assign(
    rootRef,
    context.obj({
      Type: "Outlines",
      First: items.first,
      Last: items.last,
      Count: getVisibleCount(nodes),
    }),
  );
  destination.catalog.set(PDFName.of("Outlines"), rootRef);

  const opensWithBookmarks = sources.some(
    ({ source }) =>
      source.catalog.lookup(PDFName.of("PageMode")) === PDFName.of("UseOutlines"),
  );
  if (opensWithBookmarks) {
    destination.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  }

  return nodes.length;
}
