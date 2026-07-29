"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  FileQuestion,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  getFileActionSuggestions,
  HOMEPAGE_FILE_ACCEPT,
  HOMEPAGE_FILE_MAX_BYTES,
  recognizeHomepageFile,
  type HomepageFileRecognition,
} from "@/lib/home/file-action-suggestions";
import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";

type SelectedFileMetadata = {
  readonly name: string;
  readonly size: number;
  readonly recognition: HomepageFileRecognition;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SmartFileEntry({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<SelectedFileMetadata | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  function inspectFile(file?: File) {
    setDragActive(false);
    setError("");
    setSelected(null);

    if (!file) return;
    if (file.size > HOMEPAGE_FILE_MAX_BYTES) {
      setError("Choose a supported file no larger than 55 MB.");
      return;
    }

    const recognition = recognizeHomepageFile(file);
    if (!recognition) {
      setError(
        "That file type is not recognized. Try PDF, image, text, Office, HEIC, CSV, Markdown, or HTML.",
      );
      return;
    }

    setSelected({
      name: file.name,
      size: file.size,
      recognition,
    });
  }

  const suggestions = selected
    ? getFileActionSuggestions(selected.recognition)
    : [];

  return (
    <div
      id="start-with-file"
      className="home-file-entry rounded-[1.6rem] border border-violet-200 bg-white p-3 shadow-[0_24px_80px_rgba(42,28,100,0.16)] sm:p-4"
    >
      <label
        className={`group flex min-h-[250px] cursor-pointer flex-col justify-center rounded-[1.25rem] border border-dashed px-5 py-7 text-center outline-none transition sm:min-h-[280px] sm:px-7 ${
          dragActive
            ? "border-violet-500 bg-violet-50 shadow-[inset_0_0_0_2px_rgba(101,80,232,0.12)]"
            : "border-violet-200 bg-[#faf9ff] hover:border-violet-400 hover:bg-white"
        }`}
        tabIndex={0}
        role="button"
        aria-label="Choose a document for compatible tool recommendations"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          inspectFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={HOMEPAGE_FILE_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            inspectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_15px_35px_rgba(101,80,232,0.28)] transition group-hover:-translate-y-0.5">
          <UploadCloud size={25} />
        </span>
        <span className="mt-5 block text-lg font-bold text-slate-950">
          Choose a file or drop it here
        </span>
        <span className="mx-auto mt-2 block max-w-sm text-sm leading-6 text-slate-500">
          Nothing is uploaded here. We inspect the filename and size locally to
          recommend the right tool.
        </span>
        <span className="mx-auto mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition group-hover:bg-violet-700">
          Choose a file
        </span>
        <span className="mt-3 text-xs font-medium text-slate-400">
          PDF, images, text, Office, HEIC · up to 55 MB
        </span>
      </label>

      <div aria-live="polite">
        {error ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700">
            <FileQuestion size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

        {selected ? (
          <div className="mt-3 rounded-[1.2rem] border border-violet-100 bg-white p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileCheck2 size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">
                  {selected.name}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {selected.recognition.label} · {formatFileSize(selected.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
                aria-label="Clear selected file recommendation"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Compatible next steps
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {suggestions.slice(0, 6).map((tool) => {
                const capability = capabilities[tool.id];
                const enabled = capability
                  ? capability.enabled
                  : tool.status === "working" || tool.status === "beta";
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group flex min-h-12 items-center justify-between rounded-xl bg-[#f8f7fd] px-3.5 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
                    aria-label={`${tool.title}. ${
                      enabled ? "Available" : "Backend unavailable"
                    }. The destination tool will ask you to choose the file again.`}
                  >
                    <span className="min-w-0 truncate">{tool.title}</span>
                    <span className="ml-2 flex shrink-0 items-center gap-1.5">
                      {!enabled ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                          Backend
                        </span>
                      ) : null}
                      <ArrowRight
                        size={14}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Your file has not been transferred. Choose it again inside the
              destination tool to begin processing.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

