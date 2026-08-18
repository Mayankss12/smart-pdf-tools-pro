"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getExistingTextEditSource,
  getExistingTextSourceKey,
  inferExistingTextStyle,
} from "@/lib/editor/existing-text-edit";
import { extractTextOverlayItems } from "@/lib/editor/text-overlay";
import type { TextOverlayItem } from "@/lib/editor/types";

import type { EditorController } from "../hooks/useEditor";

type ExistingTextEditLayerProps = {
  readonly editor: EditorController;
  readonly pageWidth: number;
  readonly pageHeight: number;
};

export function ExistingTextEditLayer({
  editor,
  pageWidth,
  pageHeight,
}: ExistingTextEditLayerProps) {
  const [items, setItems] = useState<TextOverlayItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (editor.activeTool !== "text" || !editor.pdfDocument) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    void (async () => {
      try {
        const page = await editor.pdfDocument?.getPage(editor.activePageNumber);
        if (!page) return;

        try {
          if (cancelled) return;

          const viewport = page.getViewport({ scale: editor.zoom });
          const extracted = await extractTextOverlayItems({
            page,
            viewport,
            pageNumber: editor.activePageNumber,
            renderScale: editor.zoom,
          });

          if (!cancelled) {
            setItems(extracted);
          }
        } finally {
          page.cleanup();
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    editor.activePageNumber,
    editor.activeTool,
    editor.pdfDocument,
    editor.zoom,
  ]);

  const sourceTextObjects = useMemo(
    () => editor.activePageObjects.filter((object) => Boolean(object.data.sourceTextEdit)),
    [editor.activePageObjects],
  );

  const replacedSourceKeys = useMemo(() => {
    return new Set(
      sourceTextObjects.flatMap((object) => {
        const source = object.data.sourceTextEdit;
        return source
          ? [getExistingTextSourceKey(object.pageNumber, source.sourceItemId)]
          : [];
      }),
    );
  }, [sourceTextObjects]);

  const safeZoom = Math.max(0.01, editor.zoom);
  const unscaledPage = {
    width: Math.max(1, pageWidth / safeZoom),
    height: Math.max(1, pageHeight / safeZoom),
  };
  const availableItems =
    editor.activeTool === "text"
      ? items.filter(
          (item) =>
            !replacedSourceKeys.has(
              getExistingTextSourceKey(editor.activePageNumber, item.id),
            ),
        )
      : [];

  function editExistingText(item: TextOverlayItem) {
    const source = getExistingTextEditSource(item, unscaledPage);
    const style = inferExistingTextStyle(item.fontName);

    editor.addObject({
      type: "text",
      pageNumber: editor.activePageNumber,
      box: source.sourceBox,
      data: {
        text: item.text,
        fontSize: source.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: "none",
        color: "#111827",
        sourceTextEdit: source,
      },
    });
    editor.setActiveTool("select");
  }

  return (
    <>
      {sourceTextObjects.map((object) => {
        const source = object.data.sourceTextEdit;
        if (!source) return null;

        return (
          <div
            key={`source-mask-${object.id}`}
            data-existing-text-source-mask
            className="pointer-events-none absolute z-[24] bg-white"
            style={{
              left: source.coverBox.x * safeZoom,
              top: source.coverBox.y * safeZoom,
              width: source.coverBox.width * safeZoom,
              height: source.coverBox.height * safeZoom,
            }}
          />
        );
      })}

      {availableItems.map((item) => (
        <button
          key={item.id}
          type="button"
          data-existing-text-edit-target
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            editExistingText(item);
          }}
          className="absolute z-[25] rounded-[2px] border border-transparent bg-transparent transition hover:border-violet-500 hover:bg-violet-400/10 focus:border-violet-600 focus:bg-violet-400/10 focus:outline-none focus:ring-2 focus:ring-violet-200"
          style={{
            left: `${item.leftPercent}%`,
            top: `${item.topPercent}%`,
            width: `${Math.max(item.widthPercent, 0.4)}%`,
            height: `${Math.max(item.heightPercent, 0.8)}%`,
          }}
          aria-label={`Edit existing text: ${item.text}`}
          title="Click to edit existing PDF text"
        />
      ))}

      {editor.activeTool === "text" && !loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[26] flex justify-center">
          <span className="rounded-full bg-slate-900/85 px-4 py-1.5 text-xs font-black text-white shadow-lg">
            {availableItems.length > 0
              ? "Click existing text to edit · drag blank area to add text"
              : "No editable text detected — drag blank area to add text"}
          </span>
        </div>
      ) : null}
    </>
  );
}
