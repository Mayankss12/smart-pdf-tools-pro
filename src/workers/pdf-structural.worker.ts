/// <reference lib="webworker" />

import { createPdfToolkit, PdfError, type PdfToolkit } from "pdfstudio";

import type {
  PdfStructuralWorkerRequest,
  PdfStructuralWorkerResponse,
} from "@/lib/pdf-structural";

declare const self: DedicatedWorkerGlobalScope;

let toolkitPromise: Promise<PdfToolkit> | null = null;

function getToolkit() {
  toolkitPromise ??= createPdfToolkit({
    wasmUrl: new URL("/pdf-security/qpdf.wasm", self.location.origin),
  });
  return toolkitPromise;
}

function post(response: PdfStructuralWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(response, transfer);
}

self.onmessage = async (event: MessageEvent<PdfStructuralWorkerRequest>) => {
  const request = event.data;
  try {
    post({ id: request.id, type: "progress", progress: 10, message: "Loading local PDF engine…" });
    const toolkit = await getToolkit();
    const input = new Uint8Array(request.input);
    if (await toolkit.isEncrypted(input)) {
      throw new Error("Unlock this PDF before running structural processing.");
    }

    post({
      id: request.id,
      type: "progress",
      progress: 42,
      message: request.operation === "repair" ? "Rebuilding PDF structure…" : "Flattening fields and annotations…",
    });
    const output = request.operation === "repair"
      ? await toolkit.repair(input)
      : await toolkit.flatten(input, { annotations: "all" });

    post({ id: request.id, type: "progress", progress: 82, message: "Verifying output…" });
    const pageCount = await toolkit.pageCount(output);
    if (pageCount < 1) throw new Error("The processed PDF has no pages.");

    const buffer = output.slice().buffer;
    post({ id: request.id, type: "success", output: buffer, pageCount }, [buffer]);
  } catch (error) {
    const message = error instanceof PdfError
      ? "This PDF could not be repaired. It may be unrecoverably damaged."
      : error instanceof Error
        ? error.message
        : "Local structural PDF processing failed.";
    post({ id: request.id, type: "error", message });
  }
};

export {};
