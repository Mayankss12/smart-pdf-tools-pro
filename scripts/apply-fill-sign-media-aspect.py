from pathlib import Path

path = Path("src/app/tools/fill-sign/page.tsx")
text = path.read_text()

replacements = [
    (
        '''import {
  isProportionalFillSignMarkKind,
  normalizeProportionalMarkBox,
  resizeProportionalMarkBox,
  scaleProportionalMarkBox,
} from "@/lib/fill-sign-layout";''',
        '''import {
  isProportionalFillSignMarkKind,
  normalizeProportionalMarkBox,
  normalizeProportionalMediaBox,
  resizeProportionalMarkBox,
  resizeProportionalMediaBox,
  scaleProportionalMarkBox,
  scaleProportionalMediaBox,
} from "@/lib/fill-sign-layout";''',
    ),
    (
        '''          if (isProportionalFillSignMarkKind(object.kind)) {
            return {
              ...object,
              box: resizeProportionalMarkBox({
                box: start,
                handle: dragState.handle,
                deltaXPercent: dxPercent,
                deltaYPercent: dyPercent,
                page: { width: rect.width, height: rect.height },
                minWidthPercent: minBox.width,
                minHeightPercent: minBox.height,
              }),
            };
          }

          let nextX = start.xPercent;''',
        '''          if (isProportionalFillSignMarkKind(object.kind)) {
            return {
              ...object,
              box: resizeProportionalMarkBox({
                box: start,
                handle: dragState.handle,
                deltaXPercent: dxPercent,
                deltaYPercent: dyPercent,
                page: { width: rect.width, height: rect.height },
                minWidthPercent: minBox.width,
                minHeightPercent: minBox.height,
              }),
            };
          }

          if (
            object.image &&
            (object.kind === "image" || object.kind === "signature")
          ) {
            return {
              ...object,
              box: resizeProportionalMediaBox({
                box: start,
                handle: dragState.handle,
                deltaXPercent: dxPercent,
                deltaYPercent: dyPercent,
                page: { width: rect.width, height: rect.height },
                aspectRatio:
                  object.image.width / Math.max(1, object.image.height),
                minWidthPercent: minBox.width,
                minHeightPercent: minBox.height,
              }),
            };
          }

          let nextX = start.xPercent;''',
    ),
    (
        '''    if (
      isProportionalFillSignMarkKind(kind) &&
      pageRect &&
      pageRect.width > 0 &&
      pageRect.height > 0
    ) {
      defaultBox = normalizeProportionalMarkBox(defaultBox, {
        width: pageRect.width,
        height: pageRect.height,
      });
    }
''',
        '''    if (
      isProportionalFillSignMarkKind(kind) &&
      pageRect &&
      pageRect.width > 0 &&
      pageRect.height > 0
    ) {
      defaultBox = normalizeProportionalMarkBox(defaultBox, {
        width: pageRect.width,
        height: pageRect.height,
      });
    } else if (
      image &&
      (kind === "image" || kind === "signature") &&
      pageRect &&
      pageRect.width > 0 &&
      pageRect.height > 0
    ) {
      defaultBox = normalizeProportionalMediaBox({
        box: defaultBox,
        page: { width: pageRect.width, height: pageRect.height },
        aspectRatio: image.width / Math.max(1, image.height),
        minWidthPercent: getMinBox(kind).width,
        minHeightPercent: getMinBox(kind).height,
      });
    }
''',
    ),
    (
        '''          if (
            isProportionalFillSignMarkKind(object.kind) &&
            pageRect &&
            pageRect.width > 0 &&
            pageRect.height > 0
          ) {
            return {
              ...object,
              box: scaleProportionalMarkBox(object.box, delta, {
                width: pageRect.width,
                height: pageRect.height,
              }),
            };
          }

          return {''',
        '''          if (
            isProportionalFillSignMarkKind(object.kind) &&
            pageRect &&
            pageRect.width > 0 &&
            pageRect.height > 0
          ) {
            return {
              ...object,
              box: scaleProportionalMarkBox(object.box, delta, {
                width: pageRect.width,
                height: pageRect.height,
              }),
            };
          }

          if (
            object.image &&
            (object.kind === "image" || object.kind === "signature") &&
            pageRect &&
            pageRect.width > 0 &&
            pageRect.height > 0
          ) {
            return {
              ...object,
              box: scaleProportionalMediaBox({
                box: object.box,
                deltaWidthPercent: delta,
                page: { width: pageRect.width, height: pageRect.height },
                aspectRatio:
                  object.image.width / Math.max(1, object.image.height),
                minWidthPercent: minBox.width,
                minHeightPercent: minBox.height,
              }),
            };
          }

          return {''',
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Guarded replacement expected 1 match, found {count}: {old[:100]!r}"
        )
    text = text.replace(old, new, 1)

path.write_text(text)
print("Fill & Sign media aspect patch applied successfully.")
