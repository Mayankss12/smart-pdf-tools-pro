import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  rgb,
  type PDFField,
  type PDFImage,
  type PDFFont,
} from "pdf-lib";

import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { PdfEngineError } from "@/lib/pdf-errors";
import {
  drawUnicodeTextLine,
  embedUnicodeFonts,
  measureUnicodeText,
  sanitizeUnicodeText,
  type BundledUnicodeFontBytes,
  type EmbeddedUnicodeFonts,
} from "@/lib/pdf-unicode-fonts";
import {
  getEditorPageGeometry,
  withEditorPageTransform,
} from "@/lib/pdf-tools/editor-page-geometry";

export type FillSignTextStyle = "clean" | "bold" | "italic";
export type FillSignObjectKind =
  | "text"
  | "signature"
  | "date"
  | "check"
  | "cross"
  | "dot"
  | "whiteout"
  | "image";

export type FillSignObjectBox = {
  readonly xPercent: number;
  readonly yPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
};

export type FillSignImage = {
  readonly id: string;
  readonly fileName: string;
  readonly previewUrl: string;
  readonly pngBytes: Uint8Array;
  readonly width: number;
  readonly height: number;
};

export type FillSignObject = {
  readonly id: string;
  readonly pageNumber: number;
  readonly kind: FillSignObjectKind;
  readonly box: FillSignObjectBox;
  readonly text: string;
  readonly style: FillSignTextStyle;
  readonly fontSize: number;
  readonly image?: FillSignImage;
  readonly signatureSource?: "typed" | "drawn" | "uploaded";
};

export type AcroFormFieldKind =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "signature"
  | "unsupported";

export type AcroFormFieldValue = string | boolean | readonly string[];

export type AcroFormFieldInfo = {
  readonly name: string;
  readonly kind: AcroFormFieldKind;
  readonly value: AcroFormFieldValue;
  readonly options: readonly string[];
  readonly readOnly: boolean;
  readonly supported: boolean;
};

export type FillSignFormMode = "preserve" | "flatten";

export type FillSignExportResult = {
  readonly blob: Blob;
  readonly replacementCount: number;
  readonly filledFieldCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function describeField(field: PDFField): AcroFormFieldInfo {
  const common = {
    name: field.getName(),
    readOnly: field.isReadOnly(),
  };

  if (field instanceof PDFTextField) {
    return {
      ...common,
      kind: "text",
      value: field.getText() ?? "",
      options: [],
      supported: true,
    };
  }
  if (field instanceof PDFCheckBox) {
    return {
      ...common,
      kind: "checkbox",
      value: field.isChecked(),
      options: [],
      supported: true,
    };
  }
  if (field instanceof PDFRadioGroup) {
    return {
      ...common,
      kind: "radio",
      value: field.getSelected() ?? "",
      options: field.getOptions(),
      supported: true,
    };
  }
  if (field instanceof PDFDropdown) {
    return {
      ...common,
      kind: "dropdown",
      value: field.getSelected(),
      options: field.getOptions(),
      supported: true,
    };
  }
  if (field instanceof PDFSignature) {
    return {
      ...common,
      kind: "signature",
      value: "",
      options: [],
      supported: false,
    };
  }

  return {
    ...common,
    kind: field instanceof PDFOptionList ? "unsupported" : "unsupported",
    value: "",
    options: [],
    supported: false,
  };
}

export async function inspectFillSignForm(file: File) {
  const bytes = await readValidatedPdfBytes(file);
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch {
    throw new PdfEngineError(
      "ENCRYPTED_OR_UNSUPPORTED",
      "This PDF could not be opened. It may be password-protected, encrypted, damaged, or unsupported.",
    );
  }

  return pdf.getForm().getFields().map(describeField);
}

function selectAppearanceFont(text: string, fonts: EmbeddedUnicodeFonts) {
  if (/[\u0900-\u097f]/.test(text)) {
    return {
      font: fonts.devanagari,
      supported: fonts.supportedCodePoints.devanagari,
    };
  }
  return {
    font: fonts.latin,
    supported: fonts.supportedCodePoints.latin,
  };
}

function sanitizeForAppearance(
  text: string,
  font: PDFFont,
  supported: ReadonlySet<number>,
) {
  const fallback = supported.has(0x3f) ? "?" : "";
  let output = "";
  let replacementCount = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && supported.has(codePoint)) {
      output += character;
    } else {
      output += fallback;
      replacementCount += 1;
    }
  }

  try {
    font.widthOfTextAtSize(output, 12);
    return { text: output, replacementCount };
  } catch {
    const ascii = output.replace(/[^\x20-\x7e]/g, fallback);
    return {
      text: ascii,
      replacementCount:
        replacementCount + Math.max(0, output.length - ascii.length),
    };
  }
}

function updateTextField(
  field: PDFTextField,
  value: string,
  fonts: EmbeddedUnicodeFonts,
) {
  const appearance = selectAppearanceFont(value, fonts);
  const sanitized = sanitizeForAppearance(
    value,
    appearance.font,
    appearance.supported,
  );
  field.setText(sanitized.text);
  field.updateAppearances(appearance.font);
  return sanitized.replacementCount;
}

function updateChoiceField(
  field: PDFRadioGroup | PDFDropdown,
  value: AcroFormFieldValue,
) {
  if (field instanceof PDFRadioGroup) {
    if (typeof value === "string" && field.getOptions().includes(value)) {
      field.select(value);
      field.updateAppearances();
      return true;
    }
    return false;
  }

  const selected = Array.isArray(value) ? [...value] : [String(value)];
  const valid = selected.filter((option) => field.getOptions().includes(option));
  if (!valid.length) return false;
  field.select(field.isMultiselect() ? valid : valid[0]);
  return true;
}

function applyFormValues(
  fields: readonly PDFField[],
  values: Readonly<Record<string, AcroFormFieldValue>>,
  fonts: EmbeddedUnicodeFonts,
) {
  let filledFieldCount = 0;
  let replacementCount = 0;

  for (const field of fields) {
    if (field.isReadOnly() || !(field.getName() in values)) continue;
    const value = values[field.getName()];

    if (field instanceof PDFTextField && typeof value === "string") {
      replacementCount += updateTextField(field, value, fonts);
      filledFieldCount += 1;
    } else if (field instanceof PDFCheckBox && typeof value === "boolean") {
      if (value) field.check();
      else field.uncheck();
      field.updateAppearances();
      filledFieldCount += 1;
    } else if (
      (field instanceof PDFRadioGroup || field instanceof PDFDropdown) &&
      updateChoiceField(field, value)
    ) {
      if (field instanceof PDFDropdown) {
        const selectedText = Array.isArray(value)
          ? value.join(" ")
          : String(value);
        const appearance = selectAppearanceFont(selectedText, fonts);
        field.updateAppearances(appearance.font);
      }
      filledFieldCount += 1;
    }
  }

  return { filledFieldCount, replacementCount };
}

export async function applyFillSignExport({
  file,
  objects,
  formValues,
  formMode,
  fontBytes,
}: {
  readonly file: File;
  readonly objects: readonly FillSignObject[];
  readonly formValues: Readonly<Record<string, AcroFormFieldValue>>;
  readonly formMode: FillSignFormMode;
  readonly fontBytes?: BundledUnicodeFontBytes;
}): Promise<FillSignExportResult> {
  const bytes = await readValidatedPdfBytes(file);
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch {
    throw new PdfEngineError(
      "ENCRYPTED_OR_UNSUPPORTED",
      "This PDF could not be opened. It may be password-protected, encrypted, damaged, or unsupported.",
    );
  }

  const pages = pdf.getPages();
  if (!pages.length) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This PDF has no pages to fill.",
    );
  }

  const fonts = await embedUnicodeFonts(pdf, "helvetica", fontBytes);
  const form = pdf.getForm();
  const formResult = applyFormValues(form.getFields(), formValues, fonts);
  const imageCache = new Map<string, PDFImage>();
  let replacementCount = formResult.replacementCount;

  for (const object of objects) {
    const pageIndex = object.pageNumber - 1;
    const targetPage = pages[pageIndex];
    if (!targetPage) {
      throw new PdfEngineError(
        "INVALID_PAGE_RANGE",
        `Overlay references missing page ${object.pageNumber}.`,
      );
    }

    const geometry = getEditorPageGeometry(targetPage);
    const boxWidth =
      (clamp(object.box.widthPercent, 0, 100) / 100) *
      geometry.viewportWidth;
    const boxHeight =
      (clamp(object.box.heightPercent, 0, 100) / 100) *
      geometry.viewportHeight;
    const boxX =
      (clamp(object.box.xPercent, 0, 100) / 100) *
      geometry.viewportWidth;
    const boxYFromTop =
      (clamp(object.box.yPercent, 0, 100) / 100) *
      geometry.viewportHeight;
    const drawX = clamp(
      boxX,
      0,
      Math.max(0, geometry.viewportWidth - boxWidth),
    );
    const drawY = clamp(
      geometry.viewportHeight - boxYFromTop - boxHeight,
      0,
      Math.max(0, geometry.viewportHeight - boxHeight),
    );

    await withEditorPageTransform(targetPage, geometry, async () => {
      if (object.kind === "whiteout") {
        targetPage.drawRectangle({
          x: drawX,
          y: drawY,
          width: boxWidth,
          height: boxHeight,
          color: rgb(1, 1, 1),
          opacity: 1,
        });
        return;
      }

      if (
        object.kind === "image" ||
        (object.kind === "signature" && object.image)
      ) {
        if (!object.image) return;
        let embeddedImage = imageCache.get(object.image.id);
        if (!embeddedImage) {
          embeddedImage = await pdf.embedPng(object.image.pngBytes);
          imageCache.set(object.image.id, embeddedImage);
        }
        targetPage.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: boxWidth,
          height: boxHeight,
          opacity: 0.98,
        });
        return;
      }

      if (object.kind === "check") {
        const startX = drawX + boxWidth * 0.18;
        const midX = drawX + boxWidth * 0.42;
        const endX = drawX + boxWidth * 0.84;
        const startY = drawY + boxHeight * 0.48;
        const midY = drawY + boxHeight * 0.22;
        const endY = drawY + boxHeight * 0.78;
        targetPage.drawLine({
          start: { x: startX, y: startY },
          end: { x: midX, y: midY },
          thickness: 2,
          color: rgb(0.08, 0.12, 0.26),
        });
        targetPage.drawLine({
          start: { x: midX, y: midY },
          end: { x: endX, y: endY },
          thickness: 2,
          color: rgb(0.08, 0.12, 0.26),
        });
        return;
      }

      if (object.kind === "cross") {
        targetPage.drawLine({
          start: {
            x: drawX + boxWidth * 0.18,
            y: drawY + boxHeight * 0.18,
          },
          end: {
            x: drawX + boxWidth * 0.82,
            y: drawY + boxHeight * 0.82,
          },
          thickness: 2,
          color: rgb(0.08, 0.12, 0.26),
        });
        targetPage.drawLine({
          start: {
            x: drawX + boxWidth * 0.82,
            y: drawY + boxHeight * 0.18,
          },
          end: {
            x: drawX + boxWidth * 0.18,
            y: drawY + boxHeight * 0.82,
          },
          thickness: 2,
          color: rgb(0.08, 0.12, 0.26),
        });
        return;
      }

      if (object.kind === "dot") {
        targetPage.drawEllipse({
          x: drawX + boxWidth / 2,
          y: drawY + boxHeight / 2,
          xScale: Math.max(2, boxWidth * 0.34),
          yScale: Math.max(2, boxHeight * 0.34),
          color: rgb(0.08, 0.12, 0.26),
        });
        return;
      }

      if (!object.text.trim()) return;
      const bold = object.style === "bold";
      const italic = object.style === "italic";
      const sanitized = sanitizeUnicodeText(object.text, fonts, bold);
      replacementCount += sanitized.replacementCount;
      if (!sanitized.text) return;

      const requestedSize = clamp(object.fontSize, 8, 48);
      const widthAtRequestedSize = measureUnicodeText(
        sanitized.text,
        requestedSize,
        fonts,
        bold,
        italic,
      );
      const availableWidth = Math.max(1, boxWidth - 10);
      const size =
        widthAtRequestedSize > availableWidth
          ? Math.max(
              5,
              requestedSize * (availableWidth / widthAtRequestedSize),
            )
          : requestedSize;
      const textWidth = measureUnicodeText(
        sanitized.text,
        size,
        fonts,
        bold,
        italic,
      );
      const textX = clamp(
        drawX + 5,
        0,
        Math.max(0, geometry.viewportWidth - textWidth - 4),
      );
      const textY = clamp(
        drawY + boxHeight / 2 - size / 2,
        0,
        Math.max(0, geometry.viewportHeight - size),
      );

      drawUnicodeTextLine({
        page: targetPage,
        text: sanitized.text,
        x: textX,
        y: textY,
        size,
        fonts,
        bold,
        italic,
        color:
          object.kind === "signature"
            ? rgb(0.18, 0.14, 0.52)
            : rgb(0.08, 0.12, 0.26),
      });
    });
  }

  if (formMode === "flatten" && form.getFields().length) {
    try {
      form.flatten({ updateFieldAppearances: false });
    } catch {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        "This PDF contains a form structure that could not be flattened safely. Export with interactive fields preserved instead.",
      );
    }
  }

  return {
    blob: new Blob(
      [
        await pdf.save({
          useObjectStreams: true,
          addDefaultPage: false,
        }),
      ],
      { type: "application/pdf" },
    ),
    replacementCount,
    filledFieldCount: formResult.filledFieldCount,
  };
}
