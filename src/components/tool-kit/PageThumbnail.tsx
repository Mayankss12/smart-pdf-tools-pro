"use client";

import {
  CheckCircle2,
  FileText,
  GripVertical,
  RotateCw,
  Trash2,
} from "lucide-react";
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

export type PageThumbnailMode =
  | "select"
  | "delete"
  | "extract"
  | "reorder"
  | "rotate";

export type PageThumbnailProps = {
  pageNumber: number;
  position?: number;
  thumbnailUrl?: string;
  isSelected: boolean;
  isMoved?: boolean;
  mode: PageThumbnailMode;
  rotation?: number;
  onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onDragStart?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: ReactDragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  showHoverActions?: boolean;
  hoverActions?: ReactNode;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getModeStyles(
  mode: PageThumbnailMode,
  isSelected: boolean,
  rotation = 0,
) {
  if (mode === "delete") {
    return {
      ring: isSelected
        ? "border-red-300 bg-red-50/80 shadow-[0_18px_45px_rgba(220,38,38,0.14)] ring-4 ring-red-100"
        : "border-[var(--border-light)] bg-white hover:border-red-200 hover:bg-red-50/45",
      badge: isSelected
        ? "border-red-200 bg-red-600 text-white"
        : "border-slate-200 bg-white text-slate-500",
      badgeLabel: isSelected ? "Delete" : "Keep",
      badgeIcon: <Trash2 size={13} />,
      number: isSelected ? "bg-red-600 text-white" : "bg-white text-slate-600",
    };
  }

  if (mode === "extract") {
    return {
      ring: isSelected
        ? "border-emerald-300 bg-emerald-50/80 shadow-[0_18px_45px_rgba(5,150,105,0.14)] ring-4 ring-emerald-100"
        : "border-[var(--border-light)] bg-white hover:border-emerald-200 hover:bg-emerald-50/45",
      badge: isSelected
        ? "border-emerald-200 bg-emerald-600 text-white"
        : "border-slate-200 bg-white text-slate-500",
      badgeLabel: isSelected ? "Extract" : "Skip",
      badgeIcon: <CheckCircle2 size={13} />,
      number: isSelected ? "bg-emerald-600 text-white" : "bg-white text-slate-600",
    };
  }

  if (mode === "rotate") {
    return {
      ring: isSelected
        ? "border-[var(--violet-border)] bg-[var(--violet-50)] shadow-[0_18px_45px_rgba(101,80,232,0.15)] ring-4 ring-violet-100"
        : "border-[var(--border-light)] bg-white hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)]",
      badge: isSelected
        ? "border-[var(--violet-border)] bg-[var(--violet-600)] text-white"
        : "border-slate-200 bg-white text-slate-500",
      badgeLabel: `${rotation}°`,
      badgeIcon: <RotateCw size={13} />,
      number: isSelected ? "bg-[var(--violet-600)] text-white" : "bg-white text-slate-600",
    };
  }

  return {
    ring: isSelected
      ? "border-[var(--violet-border)] bg-[var(--violet-50)] shadow-[0_18px_45px_rgba(101,80,232,0.15)] ring-4 ring-violet-100"
      : "border-[var(--border-light)] bg-white hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)]",
    badge: isSelected
      ? "border-[var(--violet-border)] bg-[var(--violet-600)] text-white"
      : "border-slate-200 bg-white text-slate-500",
    badgeLabel: isSelected ? "Selected" : mode === "reorder" ? "Page" : "Select",
    badgeIcon: <CheckCircle2 size={13} />,
    number: isSelected ? "bg-[var(--violet-600)] text-white" : "bg-white text-slate-600",
  };
}

export function PageThumbnail({
  pageNumber,
  position,
  thumbnailUrl,
  isSelected,
  isMoved = false,
  mode,
  rotation = 0,
  onClick,
  onDragStart,
  onDragEnd,
  draggable = false,
  showHoverActions = false,
  hoverActions,
}: PageThumbnailProps) {
  const styles = getModeStyles(mode, isSelected, rotation);
  const displayPosition = position ?? pageNumber;
  const canInteract = Boolean(onClick);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!canInteract) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  }

  return (
    <div
      role={canInteract ? "button" : undefined}
      tabIndex={canInteract ? 0 : undefined}
      aria-pressed={canInteract ? isSelected : undefined}
      aria-label={`Page ${pageNumber}${isSelected ? " selected" : ""}`}
      draggable={draggable}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={classNames(
        "group relative rounded-[1.25rem] border p-3 outline-none transition duration-200",
        "hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-violet-100",
        draggable ? "cursor-grab active:cursor-grabbing" : canInteract ? "cursor-pointer" : "",
        styles.ring,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {mode === "reorder" ? (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-slate-400 shadow-sm"
            >
              <GripVertical size={15} />
            </span>
          ) : null}

          <span
            className={classNames(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[var(--border-light)] px-2 text-xs font-bold shadow-sm",
              styles.number,
            )}
          >
            {displayPosition}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isMoved ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
              Moved
            </span>
          ) : null}

          <span
            className={classNames(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold",
              styles.badge,
            )}
          >
            {styles.badgeIcon}
            {styles.badgeLabel}
          </span>
        </div>
      </div>

      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-slate-50">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`PDF page ${pageNumber}`}
            draggable={false}
            className="h-full w-full object-contain transition duration-200"
            style={{
              transform: mode === "rotate" ? `rotate(${rotation}deg)` : undefined,
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,rgba(248,250,252,1)_0%,rgba(241,245,249,1)_100%)] text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <FileText size={22} />
            </div>
            <div className="h-2 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-2 w-14 animate-pulse rounded-full bg-slate-200" />
          </div>
        )}

        {isSelected ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-current text-[var(--violet-600)]" />
        ) : null}
      </div>

      {showHoverActions && hoverActions ? (
        <div className="absolute inset-x-3 bottom-3 translate-y-1 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="rounded-2xl border border-[var(--border-light)] bg-white/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
            {hoverActions}
          </div>
        </div>
      ) : null}
    </div>
  );
}
