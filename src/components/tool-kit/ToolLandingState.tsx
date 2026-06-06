"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { UploadCloud, type LucideIcon } from "lucide-react";

type ToolLandingStateProps = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly ctaLabel: string;
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly tips: string[];
  readonly onFileSelect: (file: File | File[]) => void;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getAcceptTokens(accept: string) {
  return accept
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function fileMatchesAccept(file: File, accept: string) {
  const tokens = getAcceptTokens(accept);

  if (tokens.length === 0) return true;

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) {
      return fileName.endsWith(token);
    }

    if (token.endsWith("/*")) {
      const group = token.replace("/*", "");
      return fileType.startsWith(`${group}/`);
    }

    if (token === "application/pdf") {
      return fileType === "application/pdf" || fileName.endsWith(".pdf");
    }

    return fileType === token;
  });
}

function getAcceptLabel(accept: string) {
  const normalized = accept.trim().toLowerCase();

  if (normalized.includes("image/")) return "Please select a supported image file.";
  if (normalized.includes("pdf")) return "Please select a valid PDF file.";

  return "Please select a supported file.";
}

export function ToolLandingState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  accept = "application/pdf",
  multiple = false,
  tips,
  onFileSelect,
}: ToolLandingStateProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) return;

    const acceptedFiles = files.filter((file) => fileMatchesAccept(file, accept));

    if (acceptedFiles.length === 0) {
      setError(getAcceptLabel(accept));
      return;
    }

    setError(null);

    if (multiple) {
      onFileSelect(acceptedFiles);
      return;
    }

    onFileSelect(acceptedFiles[0]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openPicker();
  }

  return (
    <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-12 text-[var(--text-primary)] lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(101,80,232,0.13),transparent_38%),radial-gradient(circle_at_15%_80%,rgba(124,58,237,0.08),transparent_34%)]" />

      <section className="relative w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-[var(--violet-600)] shadow-sm">
            <Icon size={26} />
          </div>

          <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
            {title}
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
            {description}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={classNames(
            "flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center shadow-[0_24px_70px_rgba(44,31,95,0.08)] transition sm:min-h-[440px]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100",
            isDraggingOver
              ? "border-[var(--violet-600)] bg-violet-50/90 ring-4 ring-violet-100"
              : "border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-white hover:border-violet-400 hover:bg-violet-50/80",
          )}
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white text-[var(--violet-600)] shadow-[0_22px_55px_rgba(101,80,232,0.18)]">
            <UploadCloud size={60} strokeWidth={1.8} />
          </div>

          <h2 className="mt-7 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
            Drop your {multiple ? "files" : "file"} here
          </h2>

          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            Click anywhere in this area, or drag and drop to start.
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="mt-7 inline-flex min-h-13 items-center justify-center rounded-full bg-[var(--violet-600)] px-8 text-sm font-black text-white shadow-[0_20px_44px_rgba(101,80,232,0.26)] transition hover:bg-[var(--violet-700)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 sm:text-base"
          >
            {ctaLabel}
          </button>

          <p className="mt-3 text-xs font-semibold text-slate-400">
            or drag and drop
          </p>

          {error ? (
            <p className="mt-6 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        {tips.length > 0 ? (
          <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-400">
            {tips.join(" · ")}
          </p>
        ) : null}
      </section>
    </main>
  );
}
