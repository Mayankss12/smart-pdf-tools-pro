import { rgb, type PDFPage } from "pdf-lib";

import { buildStampLines, type EditorStampFormat, type EditorStampPreset } from "../editor/editor-stamp";
import { drawEditorRichTextObject, type EmbeddedTextFonts } from "./editor-rich-text-engine";
import type { EditorPageGeometry } from "./editor-page-geometry";

type StampExportObject = {
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly data: {
    readonly stampPreset?: EditorStampPreset;
    readonly stampFormat?: EditorStampFormat;
    readonly stampAuthorizedName?: string;
    readonly stampDate?: string;
    readonly stampColor?: string;
    readonly stampLabel?: string;
    readonly opacity?: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function hexToRgb(value: string | undefined) {
  const normalized = value?.replace("#", "") ?? "166534";
  const safe = /^[0-9a-f]{6}$/i.test(normalized) ? normalized : "166534";
  return rgb(
    Number.parseInt(safe.slice(0, 2), 16) / 255,
    Number.parseInt(safe.slice(2, 4), 16) / 255,
    Number.parseInt(safe.slice(4, 6), 16) / 255,
  );
}

export function drawEditorGeneratedStamp(
  page: PDFPage,
  object: StampExportObject,
  fonts: EmbeddedTextFonts,
  geometry: EditorPageGeometry,
) {
  const width = clamp(object.box.width, 1, geometry.viewportWidth);
  const height = clamp(object.box.height, 1, geometry.viewportHeight);
  const x = clamp(object.box.x, 0, Math.max(0, geometry.viewportWidth - width));
  const top = clamp(object.box.y, 0, Math.max(0, geometry.viewportHeight - height));
  const y = geometry.viewportHeight - top - height;
  const color = hexToRgb(object.data.stampColor);
  const opacity = clamp(object.data.opacity ?? 0.88, 0, 1);
  const format = object.data.stampFormat ?? "rectangle";
  const borderWidth = clamp(Math.min(width, height) * 0.035, 1.5, 4);

  if (format === "rectangle") {
    page.drawRectangle({ x, y, width, height, borderColor: color, borderWidth, borderOpacity: opacity, opacity: 0 });
  } else {
    const ellipseWidth = format === "round" ? Math.min(width, height) : width;
    const ellipseHeight = format === "round" ? Math.min(width, height) : height;
    page.drawEllipse({
      x: x + width / 2,
      y: y + height / 2,
      xScale: ellipseWidth / 2,
      yScale: ellipseHeight / 2,
      borderColor: color,
      borderWidth,
      borderOpacity: opacity,
      opacity: 0,
    });
  }

  const preset = object.data.stampPreset ?? "Approved";
  const lines = buildStampLines({
    preset,
    format,
    authorizedName: object.data.stampAuthorizedName ?? "",
    date: object.data.stampDate ?? "",
    color: object.data.stampColor ?? "#166534",
  });
  const text = lines.length ? lines.join("\n") : object.data.stampLabel ?? "STAMP";
  const paddingX = Math.min(14, width * 0.1);
  const paddingY = Math.min(10, height * 0.12);

  drawEditorRichTextObject(
    page,
    {
      box: {
        x: x + paddingX,
        y: top + paddingY,
        width: Math.max(1, width - paddingX * 2),
        height: Math.max(1, height - paddingY * 2),
      },
      data: {
        text,
        fontSize: clamp(height / (lines.length > 1 ? 4.3 : 2.8), 8, 24),
        fontWeight: "bold",
        color: object.data.stampColor ?? "#166534",
        opacity,
      },
    },
    fonts,
    geometry,
  );
}
