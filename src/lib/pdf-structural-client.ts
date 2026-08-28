"use client";

import type {
  PdfStructuralOperation,
  PdfStructuralWorkerRequest,
  PdfStructuralWorkerResponse,
} from "@/lib/pdf-structural";

export function runPdfStructuralWorker({
  operation,
  input,
  onProgress,
  signal,
}: {
  readonly operation: PdfStructuralOperation;
  readonly input: ArrayBuffer;
  readonly onProgress?: (progress: number, message: string) => void;
  readonly signal?: AbortSignal;
}) {
  return new Promise<{ output: Uint8Array; pageCount: number }>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/pdf-structural.worker.ts", import.meta.url), {
      type: "module",
      name: "pdfmantra-pdf-structural",
    });
    const id = crypto.randomUUID();
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      callback();
    };
    const abort = () => finish(() => reject(new Error("Processing cancelled.")));
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error("Processing timed out. Try a smaller PDF."))),
      240_000,
    );

    worker.onmessage = (event: MessageEvent<PdfStructuralWorkerResponse>) => {
      const response = event.data;
      if (response.id !== id) return;
      if (response.type === "progress") {
        onProgress?.(response.progress, response.message);
      } else if (response.type === "error") {
        finish(() => reject(new Error(response.message)));
      } else {
        finish(() => resolve({ output: new Uint8Array(response.output), pageCount: response.pageCount }));
      }
    };
    worker.onerror = () => finish(() => reject(new Error("The local PDF worker could not start.")));
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    const request: PdfStructuralWorkerRequest = { id, operation, input };
    worker.postMessage(request, [input]);
  });
}
