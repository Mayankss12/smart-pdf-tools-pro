"use client";

import {
  PdfSecurityError,
  type PdfSecurityProgress,
  type PdfSecurityWorkerRequest,
  type PdfSecurityWorkerResponse,
} from "@/lib/pdf-security";

const WORKER_TIMEOUT_MS = 180_000;

type RunPdfSecurityWorkerOptions = {
  readonly request: PdfSecurityWorkerRequest;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: PdfSecurityProgress) => void;
};

export function runPdfSecurityWorker({
  request,
  signal,
  onProgress,
}: RunPdfSecurityWorkerOptions): Promise<{
  output: Uint8Array;
  outputSize: number;
  encryptionMethod: string | null;
}> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/pdf-security.worker.ts", import.meta.url),
      { type: "module", name: "pdfmantra-pdf-security" },
    );
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
      worker.terminate();
      callback();
    };

    const handleAbort = () => {
      finish(() =>
        reject(new PdfSecurityError("CANCELLED", "PDF security processing cancelled.")),
      );
    };

    const timeoutId = window.setTimeout(() => {
      finish(() =>
        reject(
          new PdfSecurityError(
            "TIMEOUT",
            "PDF security processing took too long. Try a smaller PDF.",
          ),
        ),
      );
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<PdfSecurityWorkerResponse>) => {
      const response = event.data;
      if (response.id !== request.id) return;

      if (response.type === "progress") {
        onProgress?.({ progress: response.progress, message: response.message });
        return;
      }

      if (response.type === "error") {
        finish(() => reject(new PdfSecurityError(response.code, response.message)));
        return;
      }

      finish(() =>
        resolve({
          output: new Uint8Array(response.output),
          outputSize: response.outputSize,
          encryptionMethod: response.encryptionMethod,
        }),
      );
    };

    worker.onerror = () => {
      finish(() =>
        reject(
          new PdfSecurityError(
            "PROCESSING_FAILED",
            "The local PDF security worker could not start.",
          ),
        ),
      );
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
    worker.postMessage(request, [request.input]);
  });
}
