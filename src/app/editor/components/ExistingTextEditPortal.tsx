"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { EditorController } from "../hooks/useEditor";
import { ExistingTextEditLayer } from "./ExistingTextEditLayer";

type LayerSize = {
  readonly width: number;
  readonly height: number;
};

function findPageLayer() {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas.block.bg-white");
  return canvas?.parentElement instanceof HTMLDivElement ? canvas.parentElement : null;
}

export function ExistingTextEditPortal({ editor }: { readonly editor: EditorController }) {
  const [pageLayer, setPageLayer] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<LayerSize>({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const mutationObserver = new MutationObserver(() => {
      connectLayer();
    });

    function connectLayer() {
      if (cancelled) return;
      const nextLayer = findPageLayer();
      if (!nextLayer) return;

      mutationObserver.disconnect();
      setPageLayer(nextLayer);
      setSize({
        width: nextLayer.clientWidth,
        height: nextLayer.clientHeight,
      });

      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => {
        setSize({
          width: nextLayer.clientWidth,
          height: nextLayer.clientHeight,
        });
      });
      resizeObserver.observe(nextLayer);
    }

    mutationObserver.observe(document.body, { childList: true, subtree: true });
    connectLayer();

    return () => {
      cancelled = true;
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      setPageLayer(null);
    };
  }, [editor.file, editor.pdfDocument]);

  if (!pageLayer || size.width <= 0 || size.height <= 0) return null;

  return createPortal(
    <ExistingTextEditLayer
      editor={editor}
      pageWidth={size.width}
      pageHeight={size.height}
    />,
    pageLayer,
  );
}
