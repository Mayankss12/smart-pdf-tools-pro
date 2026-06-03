"use client";

import {
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
} from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

export type PdfDropzoneProps = {
  onFile: (file: File) => void;
  loading?: boolean;
  loadingLabel?: string;
  progress?: number;
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  currentFileName?: string;
  pageCount?: number;
  fileSize?: number;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return null;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function clampProgress(progress?: number) {
  if (typeof progress !== "number" || Number.isNaN(progress)) return 0;

  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function PdfDropzone({
  onFile,
  loading = false,
  loadingLabel = "Preparing preview...",
  progress = 0,
  accept = "application/pdf",
  multiple = false,
  onFiles,
  currentFileName,
  pageCount,
  fileSize,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeProgress = clampProgress(progress);
  const formattedSize = formatFileSize(fileSize);
  const hasCurrentFile = Boolean(currentFileName);

  function openFilePicker() {
    if (loading) return;
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);

    if (nextFiles.length === 0) return;

    if (multiple) {
      onFiles?.(nextFiles);
      onFile(nextFiles[0]);
      return;
    }

    onFile(nextFiles[0]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      handleFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (loading) return;

    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    setIsDragging(false);

    if (loading) return;

    handleFiles(event.dataTransfer.files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openFilePicker();
  }

  return (
    <div
      role="button"
      tabIndex={loading ? -1 : 0}
      aria-disabled={loading}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={classNames(
        "relative overflow-hidden rounded-[2rem] border border-dashed p-6 text-left outline-none transition duration-200 sm:p-7",
        "focus-visible:ring-4 focus-visible:ring-violet-100",
        loading ? "cursor-not-allowed opacity-80" : "cursor-pointer",
        isDragging
          ? "border-[var(--violet-600)] bg-[var(--violet-50)] shadow-[0_20px_60px_rgba(101,80,232,0.16)]"
          : "border-[var(--violet-border)] bg-white hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card)]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={loading}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.16)_0%,rgba(101,80,232,0.06)_45%,rgba(255,255,255,0)_72%)]" />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_18px_40px_rgba(101,80,232,0.24)]">
            {loading ? (
              <Loader2 size={25} className="animate-spin" />
            ) : hasCurrentFile ? (
              <CheckCircle2 size={25} />
            ) : (
              <UploadCloud size={26} />
            )}
          </div>

          <div>
            <p className="text-base font-black tracking-[-0.02em] text-slate-950">
              {loading
                ? loadingLabel
                : hasCurrentFile
                  ? currentFileName
                  : multiple
                    ? "Drop PDF files here"
                    : "Drop your PDF here"}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {loading
                ? "Rendering thumbnails and preparing your workspace."
                : hasCurrentFile
                  ? "Click or drop another file to replace it."
                  : "Click to browse, or drag and drop your file here."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] bg-white px-3 py-1 text-xs font-bold text-slate-600">
                <FileText size={13} />
                {accept === "image/*" ? "Images" : "PDF"}
              </span>

              {typeof pageCount === "number" && pageCount > 0 ? (
                <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                </span>
              ) : null}

              {formattedSize ? (
                <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {formattedSize}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center justify-center rounded-full bg-[var(--violet-600)] px-5 py-3 text-sm font-black text-white shadow-[0_18px_35px_rgba(101,80,232,0.22)] transition">
            {loading ? `${safeProgress}%` : hasCurrentFile ? "Replace" : "Browse"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 mt-5 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-2 rounded-full bg-[var(--violet-600)] transition-all duration-300"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
