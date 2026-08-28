/// <reference lib="webworker" />

import {
  createPdfToolkit,
  PdfError,
  PdfPasswordError,
  type PdfToolkit,
} from "pdfstudio";

import type {
  PdfSecurityErrorCode,
  PdfSecurityWorkerRequest,
  PdfSecurityWorkerResponse,
} from "@/lib/pdf-security";

declare const self: DedicatedWorkerGlobalScope;

let toolkitPromise: Promise<PdfToolkit> | null = null;

function post(response: PdfSecurityWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(response, transfer);
}

function progress(id: string, value: number, message: string) {
  post({ id, type: "progress", progress: value, message });
}

function getToolkit() {
  toolkitPromise ??= createPdfToolkit({
    wasmUrl: new URL("/pdf-security/qpdf.wasm", self.location.origin),
  });
  return toolkitPromise;
}

function createOwnerPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function workerFailure(error: unknown): {
  code: PdfSecurityErrorCode;
  message: string;
} {
  if (error instanceof PdfPasswordError) {
    return {
      code: "WRONG_PASSWORD",
      message: "The password is incorrect. Enter the password used to open this PDF.",
    };
  }

  if (error instanceof PdfError) {
    return {
      code: "INVALID_PDF",
      message: "This PDF could not be processed. It may be damaged or use an unsupported security handler.",
    };
  }

  if (error instanceof RangeError) {
    return {
      code: "PROCESSING_FAILED",
      message: "The browser ran out of memory while processing this PDF. Try a smaller file.",
    };
  }

  return {
    code: "PROCESSING_FAILED",
    message: "PDF security processing failed. Please try another valid PDF.",
  };
}

self.onmessage = async (event: MessageEvent<PdfSecurityWorkerRequest>) => {
  const request = event.data;

  try {
    progress(request.id, 8, "Loading the local security engine…");
    const toolkit = await getToolkit();
    const input = new Uint8Array(request.input);

    progress(request.id, 24, "Inspecting PDF security…");
    const encrypted = await toolkit.isEncrypted(input);

    if (request.operation === "protect") {
      if (encrypted) {
        post({
          id: request.id,
          type: "error",
          code: "ALREADY_ENCRYPTED",
          message: "This PDF is already encrypted. Unlock it first if you need to change its password.",
        });
        return;
      }

      progress(request.id, 52, "Applying AES-256 encryption…");
      const output = await toolkit.lock(input, {
        userPassword: request.password,
        ownerPassword: createOwnerPassword(),
        keyLength: 256,
        permissions: {
          print: request.permissions.allowPrinting ? "full" : "none",
          modify: request.permissions.allowEditing ? "all" : "none",
          extract: request.permissions.allowCopying,
          accessibility: true,
        },
      });

      progress(request.id, 84, "Verifying encrypted output…");
      const info = await toolkit.getInfo(output, { password: request.password });
      const method = info.encryption?.method ?? "";
      if (!info.encrypted || info.encryption?.bits !== 256 || !method.startsWith("AES")) {
        post({
          id: request.id,
          type: "error",
          code: "OUTPUT_VERIFICATION_FAILED",
          message: "The protected output could not be verified as AES-256 encrypted.",
        });
        return;
      }

      const outputBuffer = output.slice().buffer;
      post(
        {
          id: request.id,
          type: "success",
          output: outputBuffer,
          outputSize: output.byteLength,
          encryptionMethod: `${method} ${info.encryption.bits}-bit`,
        },
        [outputBuffer],
      );
      return;
    }

    if (!encrypted) {
      post({
        id: request.id,
        type: "error",
        code: "NOT_ENCRYPTED",
        message: "This PDF does not have password encryption to remove.",
      });
      return;
    }

    progress(request.id, 52, "Validating password and removing encryption…");
    const output = await toolkit.unlock(input, { password: request.password });

    progress(request.id, 84, "Verifying unlocked output…");
    if (await toolkit.isEncrypted(output)) {
      post({
        id: request.id,
        type: "error",
        code: "OUTPUT_VERIFICATION_FAILED",
        message: "The output is still encrypted, so no download was created.",
      });
      return;
    }

    const outputBuffer = output.slice().buffer;
    post(
      {
        id: request.id,
        type: "success",
        output: outputBuffer,
        outputSize: output.byteLength,
        encryptionMethod: null,
      },
      [outputBuffer],
    );
  } catch (error) {
    const failure = workerFailure(error);
    post({ id: request.id, type: "error", ...failure });
  }
};

export {};
