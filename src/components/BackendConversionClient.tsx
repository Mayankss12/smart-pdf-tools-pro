"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileWarning,
  Loader2,
  RefreshCcw,
  ServerCog,
  StopCircle,
  Upload,
} from "lucide-react";

import { formatFileSize } from "@/lib/pdf-engine";
import {
  getConversionPollDelay,
  isTransientPollStatus,
} from "@/lib/conversions/polling";

type BackendJobStatus =
  | "queued"
  | "validating"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

interface BackendJob {
  readonly id: string;
  readonly status: BackendJobStatus;
  readonly progress: number | null;
  readonly errorMessage: string | null;
  readonly outputAvailable: boolean;
  readonly expiresAt: string | null;
}

interface BackendConversionClientProps {
  readonly conversionId: string;
  readonly enabled: boolean;
  readonly disabledReason: string;
  readonly acceptedExtensions: readonly string[];
  readonly maxFileSize: number;
  readonly sourceFormat: string;
  readonly destinationFormat: string;
  readonly isUrlSource: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJobStatus(value: unknown): value is BackendJobStatus {
  return (
    value === "queued" ||
    value === "validating" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "expired"
  );
}

function parseJob(value: unknown): BackendJob | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isJobStatus(value.status)
  ) {
    return null;
  }
  return {
    id: value.id,
    status: value.status,
    progress:
      typeof value.progress === "number" &&
      Number.isFinite(value.progress)
        ? Math.max(0, Math.min(100, value.progress))
        : null,
    errorMessage:
      typeof value.errorMessage === "string" ? value.errorMessage : null,
    outputAvailable: value.outputAvailable === true,
    expiresAt:
      typeof value.expiresAt === "string" ? value.expiresAt : null,
  };
}

function getPayloadJob(payload: unknown) {
  return isRecord(payload) ? parseJob(payload.job) : null;
}

function getPayloadMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.message === "string"
    ? payload.message
    : fallback;
}

function isActiveJob(job: BackendJob | null) {
  return (
    job?.status === "queued" ||
    job?.status === "validating" ||
    job?.status === "processing"
  );
}

export function BackendConversionClient({
  conversionId,
  enabled,
  disabledReason,
  acceptedExtensions,
  maxFileSize,
  sourceFormat,
  destinationFormat,
  isUrlSource,
}: BackendConversionClientProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [job, setJob] = useState<BackendJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [pollFailureCount, setPollFailureCount] = useState(0);
  const [pollingStopped, setPollingStopped] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const [status, setStatus] = useState(
    enabled
      ? `Choose a ${sourceFormat.toUpperCase()} source to begin.`
      : disabledReason,
  );

  useEffect(() => {
    if (!enabled || !isActiveJob(job) || pollingStopped) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/conversions/jobs/${encodeURIComponent(job.id)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json();
        const nextJob = getPayloadJob(payload);
        if (!response.ok || !nextJob) {
          if (isTransientPollStatus(response.status)) {
            setPollFailureCount((count) => count + 1);
            setStatus(
              "Temporary status error. Retrying the conversion service automatically...",
            );
            return;
          }
          setBusy(false);
          setPollingStopped(true);
          setStatus(
            response.status === 401 || response.status === 403
              ? "Your conversion session is no longer authorized. Sign in and retry."
              : getPayloadMessage(
                  payload,
                  "Unable to read the conversion job status.",
                ),
          );
          return;
        }
        setPollFailureCount(0);
        setJob(nextJob);
        if (nextJob.status === "completed") {
          setBusy(false);
          setStatus("Conversion completed. Your private output is ready.");
        } else if (nextJob.status === "failed") {
          setBusy(false);
          setStatus(
            nextJob.errorMessage ?? "The provider could not convert this file.",
          );
        } else if (nextJob.status === "cancelled") {
          setBusy(false);
          setStatus("Conversion cancelled.");
        } else if (nextJob.status === "expired") {
          setBusy(false);
          setStatus("This conversion output has expired.");
        } else {
          setStatus(
            nextJob.progress === null
              ? "The provider is processing your conversion..."
              : `Provider progress: ${Math.round(nextJob.progress)}%.`,
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPollFailureCount((count) => count + 1);
        setStatus(
          "Temporary network error. Retrying the conversion service automatically...",
        );
      }
    }, getConversionPollDelay(pollFailureCount));
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, job, pollFailureCount, pollingStopped, pollNonce]);

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    const extension = selected.name
      .toLowerCase()
      .slice(selected.name.lastIndexOf("."));
    if (!acceptedExtensions.includes(extension)) {
      setFile(null);
      setStatus(
        `Choose a supported ${sourceFormat.toUpperCase()} file (${acceptedExtensions.join(", ")}).`,
      );
      return;
    }
    if (selected.size <= 0 || selected.size > maxFileSize) {
      setFile(null);
      setStatus(
        `Choose a non-empty file up to ${formatFileSize(maxFileSize)}.`,
      );
      return;
    }
    setFile(selected);
    setJob(null);
    setPollFailureCount(0);
    setPollingStopped(false);
    setStatus(
      `${selected.name} is ready (${formatFileSize(selected.size)}).`,
    );
  }

  async function startConversion() {
    if (!enabled || busy) return;
    if (isUrlSource ? !sourceUrl.trim() : !file) {
      setStatus(
        isUrlSource
          ? "Enter a public HTTP or HTTPS webpage URL."
          : `Choose a ${sourceFormat.toUpperCase()} file first.`,
      );
      return;
    }
    setBusy(true);
    setJob(null);
    setPollFailureCount(0);
    setPollingStopped(false);
    setStatus("Validating source and starting a private conversion job...");
    try {
      const form = new FormData();
      form.set("conversionId", conversionId);
      if (file) form.set("file", file, file.name);
      if (isUrlSource) form.set("sourceUrl", sourceUrl.trim());
      const response = await fetch("/api/conversions/jobs", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const payload: unknown = await response.json();
      const createdJob = getPayloadJob(payload);
      if (!response.ok || !createdJob) {
        setBusy(false);
        setStatus(
          getPayloadMessage(payload, "Unable to start this conversion."),
        );
        return;
      }
      setJob(createdJob);
      setStatus("Conversion job accepted by the configured provider.");
    } catch {
      setBusy(false);
      setStatus("Unable to contact the conversion service.");
    }
  }

  async function cancelConversion() {
    if (!job || !isActiveJob(job)) return;
    setStatus("Requesting cancellation...");
    try {
      const response = await fetch(
        `/api/conversions/jobs/${encodeURIComponent(job.id)}/cancel`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      const payload: unknown = await response.json();
      const cancelledJob = getPayloadJob(payload);
      if (!response.ok || !cancelledJob) {
        setStatus(
          getPayloadMessage(payload, "Unable to cancel this conversion."),
        );
        return;
      }
      setJob(cancelledJob);
      setBusy(false);
      setStatus(
        cancelledJob.status === "cancelled"
          ? "Conversion cancelled."
          : "Cancellation was requested. Waiting for the provider...",
      );
    } catch {
      setStatus("Unable to contact the conversion service.");
    }
  }

  function downloadOutput() {
    if (!job?.outputAvailable || job.status !== "completed") return;
    const link = document.createElement("a");
    link.href = `/api/conversions/jobs/${encodeURIComponent(job.id)}/download`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus("Secure download started.");
  }

  function reset() {
    setFile(null);
    setSourceUrl("");
    setJob(null);
    setBusy(false);
    setPollFailureCount(0);
    setPollingStopped(false);
    setStatus(
      enabled
        ? `Choose a ${sourceFormat.toUpperCase()} source to begin.`
        : disabledReason,
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <FileWarning className="mx-auto text-amber-600" size={38} />
        <h2 className="mt-4 text-xl font-bold">Conversion is not enabled</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
          {disabledReason}
        </p>
        <button
          type="button"
          disabled
          className="mt-6 inline-flex min-w-48 items-center justify-center rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-500"
        >
          Upload unavailable
        </button>
      </div>
    );
  }

  const jobActive = isActiveJob(job);
  const canDownload =
    job?.status === "completed" && job.outputAvailable;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <ServerCog size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Secure provider conversion</h2>
          <p className="text-sm text-slate-500">
            {sourceFormat.toUpperCase()} to {destinationFormat.toUpperCase()}
          </p>
        </div>
      </div>

      {isUrlSource ? (
        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-700">Public webpage URL</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(event) => {
              setSourceUrl(event.target.value);
              setJob(null);
            }}
            disabled={busy}
            placeholder="https://example.com/page"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
          />
        </label>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedExtensions.join(",")}
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files[0]);
            }}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 px-5 py-5 text-left transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              <span className="block text-sm font-bold text-violet-900">
                {file ? file.name : `Choose ${sourceFormat.toUpperCase()} file`}
              </span>
              <span className="mt-1 block text-xs font-semibold text-violet-600">
                {file
                  ? formatFileSize(file.size)
                  : `${acceptedExtensions.join(", ")} · up to ${formatFileSize(maxFileSize)}`}
              </span>
            </span>
            <Upload size={21} className="shrink-0 text-violet-700" />
          </button>
        </>
      )}

      {jobActive && job?.progress !== null ? (
        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={job.progress}
        >
          <div
            className="h-full rounded-full bg-violet-600 transition-[width]"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      ) : null}

      <div
        className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
        aria-live="polite"
      >
        {status}
        {job?.expiresAt && job.status === "completed"
          ? ` Output access expires ${new Date(job.expiresAt).toLocaleString()}.`
          : ""}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {canDownload ? (
          <button
            type="button"
            onClick={downloadOutput}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <Download size={17} />
            Download output
          </button>
        ) : jobActive ? (
          <button
            type="button"
            onClick={cancelConversion}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            <StopCircle size={17} />
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={startConversion}
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <CheckCircle2 size={17} />
            )}
            Start conversion
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={jobActive}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw size={16} />
          Convert another
        </button>
        {job && (pollFailureCount > 0 || pollingStopped) ? (
          <button
            type="button"
            onClick={() => {
              setPollingStopped(false);
              setPollFailureCount(0);
              setBusy(true);
              setPollNonce((value) => value + 1);
              setStatus("Retrying conversion status now...");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 text-sm font-bold text-violet-700 hover:bg-violet-100"
          >
            <RefreshCcw size={16} />
            Retry status
          </button>
        ) : null}
      </div>
    </div>
  );
}
