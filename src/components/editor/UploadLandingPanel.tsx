"use client";

import { FileText, Upload } from "lucide-react";

type UploadLandingPanelProps = {
  busy?: boolean;
  status?: string;
  onBrowseClick: () => void;
  onFileDrop: (file?: File) => void;
};

export function UploadLandingPanel({
  busy = false,
  status,
  onBrowseClick,
  onFileDrop,
}: UploadLandingPanelProps) {
  const showStatus =
    status &&
    status !== "Upload a PDF to start editing." &&
    status !== "PDF loaded. Choose a tool to start editing.";

  return (
    <main className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
          Edit your PDF
        </h1>

        <p className="mt-3 text-sm font-medium text-slate-500 sm:text-base">
          Upload a PDF to get started.
        </p>

        <div
          onDrop={(event) => {
            event.preventDefault();
            onFileDrop(event.dataTransfer.files?.[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
          className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 shadow-sm transition hover:border-indigo-300"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <FileText size={26} />
          </div>

          <div className="mt-5 text-lg font-semibold text-slate-950">
            Drop your PDF here
          </div>

          <div className="mt-1 text-sm font-medium text-slate-500">
            or choose a file from your device
          </div>

          <button
            type="button"
            onClick={onBrowseClick}
            disabled={busy}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={17} />
            {busy ? "Loading..." : "Upload PDF"}
          </button>

          {showStatus ? (
            <p className="mt-4 text-sm font-medium text-rose-600">
              {status}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
