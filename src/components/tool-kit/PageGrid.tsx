"use client";

import {
  useCallback,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import {
  PageThumbnail,
  type PageThumbnailMode,
} from "@/components/tool-kit/PageThumbnail";

export type PageGridData = {
  pageNumber: number;
  position?: number;
  thumbnailUrl?: string;
  thumbnail?: string;
  isMoved?: boolean;
};

type PageGridColumns = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type PageGridProps = {
  pages: PageGridData[];
  selectedPages: number[];
  mode: PageThumbnailMode;

  onPageClick: (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => void;

  draggable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;

  rotationMap?: Record<number, number>;

  renderHoverActions?: (page: PageGridData, index: number) => ReactNode;

  columns?: PageGridColumns;
  loading?: boolean;
  emptyMessage?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getGridColumnsClass(columns?: PageGridColumns) {
  const key = columns
    ? `${columns.sm}-${columns.md}-${columns.lg}-${columns.xl}`
    : "2-3-4-5";

  const columnClassMap: Record<string, string> = {
    "1-2-3-4": "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    "2-3-4-5": "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    "2-3-5-6": "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
    "2-4-5-6": "grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    "3-4-5-6": "grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  };

  return columnClassMap[key] ?? columnClassMap["2-3-4-5"];
}

function createSkeletonPages(count = 10): PageGridData[] {
  return Array.from({ length: count }, (_, index) => ({
    pageNumber: index + 1,
    position: index + 1,
  }));
}

export function PageGrid({
  pages,
  selectedPages,
  mode,
  onPageClick,
  draggable = false,
  onReorder,
  rotationMap = {},
  renderHoverActions,
  columns,
  loading = false,
  emptyMessage = "Upload a PDF to preview pages.",
}: PageGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const gridColumnsClass = getGridColumnsClass(columns);

  const visiblePages = loading && pages.length === 0 ? createSkeletonPages() : pages;

  const canDrag = draggable && Boolean(onReorder) && visiblePages.length > 1 && !loading;

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, index: number) => {
      if (!canDrag) return;

      setDraggedIndex(index);
      setDropTargetIndex(index);

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    [canDrag],
  );

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, index: number) => {
      if (!canDrag) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTargetIndex(index);
    },
    [canDrag],
  );

  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, index: number) => {
      if (!canDrag) return;

      const nextTarget = event.relatedTarget;

      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }

      setDropTargetIndex((currentIndex) =>
        currentIndex === index ? null : currentIndex,
      );
    },
    [canDrag],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, index: number) => {
      if (!canDrag || draggedIndex === null || !onReorder) return;

      event.preventDefault();

      if (draggedIndex !== index) {
        onReorder(draggedIndex, index);
      }

      setDraggedIndex(null);
      setDropTargetIndex(null);
    },
    [canDrag, draggedIndex, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, []);

  if (!loading && visiblePages.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[var(--border-light)] bg-white/75 p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-700)]">
          <span className="text-lg font-black">PDF</span>
        </div>
        <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-400">
          Page thumbnails will appear here after upload.
        </p>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        "grid gap-4",
        gridColumnsClass,
        loading ? "pointer-events-none opacity-80" : "",
      )}
      aria-busy={loading}
    >
      {visiblePages.map((page, index) => {
        const thumbnailUrl = page.thumbnailUrl || page.thumbnail || "";
        const isDropTarget = canDrag && dropTargetIndex === index;
        const isDragging = canDrag && draggedIndex === index;
        const hoverActions = renderHoverActions?.(page, index);

        return (
          <div
            key={`${page.pageNumber}-${page.position ?? index}`}
            onDragOver={(event) => handleDragOver(event, index)}
            onDragLeave={(event) => handleDragLeave(event, index)}
            onDrop={(event) => handleDrop(event, index)}
            className={classNames(
              "rounded-[1.4rem] transition duration-200",
              isDropTarget && !isDragging
                ? "ring-4 ring-violet-100 ring-offset-2 ring-offset-white"
                : "",
              isDragging ? "scale-[0.98] opacity-45" : "",
            )}
          >
            <PageThumbnail
              pageNumber={page.pageNumber}
              position={page.position ?? index + 1}
              thumbnailUrl={thumbnailUrl}
              isSelected={selectedSet.has(page.pageNumber)}
              isMoved={page.isMoved}
              mode={mode}
              rotation={rotationMap[page.pageNumber] ?? 0}
              draggable={canDrag}
              onClick={(event) => onPageClick(page.pageNumber, event)}
              onDragStart={(event) => handleDragStart(event, index)}
              onDragEnd={handleDragEnd}
              showHoverActions={Boolean(hoverActions)}
              hoverActions={hoverActions}
            />
          </div>
        );
      })}
    </div>
  );
}
