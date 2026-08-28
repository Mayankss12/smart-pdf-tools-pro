"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { runPdfSecurityWorker } from "@/lib/pdf-security-client";
import {
  createPdfSecurityFileName,
  PDF_SECURITY_MAX_SIZE_MB,
  PdfSecurityError,
  validateProtectPassword,
  type PdfSecurityMode,
  type PdfSecurityPermissions,
  type PdfSecurityProgress,
  type PdfSecurityResult,
  type PdfSecurityWorkerRequest,
} from "@/lib/pdf-security";

type RunOptions = {
  readonly file: File;
  readonly mode: PdfSecurityMode;
  readonly password: string;
  readonly permissions?: PdfSecurityPermissions;
};

const INITIAL_PROGRESS: PdfSecurityProgress = {
  progress: 0,
  message: "Ready",
};

export function usePdfSecurity() {
  const abortRef = useRef<AbortController | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<PdfSecurityProgress>(INITIAL_PROGRESS);
  const [error, setError] = useState<PdfSecurityError | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    setProgress(INITIAL_PROGRESS);
    setError(null);
  }, []);

  const run = useCallback(async ({ file, mode, password, permissions }: RunOptions) => {
    if (mode === "protect") validateProtectPassword(password);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    setError(null);
    setProgress({ progress: 2, message: "Reading PDF locally…" });

    try {
      const bytes = await readValidatedPdfBytes(file, PDF_SECURITY_MAX_SIZE_MB);
      const input = bytes.slice().buffer;
      const id = crypto.randomUUID();
      const request: PdfSecurityWorkerRequest =
        mode === "protect"
          ? {
              id,
              operation: "protect",
              input,
              password,
              permissions: permissions ?? {
                allowPrinting: true,
                allowCopying: true,
                allowEditing: true,
              },
            }
          : { id, operation: "unlock", input, password };

      const workerResult = await runPdfSecurityWorker({
        request,
        signal: controller.signal,
        onProgress: setProgress,
      });
      const outputBytes = workerResult.output.slice();
      const result: PdfSecurityResult = {
        bytes: outputBytes,
        blob: new Blob([outputBytes], { type: "application/pdf" }),
        fileName: createPdfSecurityFileName(mode, file.name),
        outputSize: workerResult.outputSize,
        encryptionMethod: workerResult.encryptionMethod,
      };

      setProgress({ progress: 100, message: "Verified output ready." });
      return result;
    } catch (caught) {
      const nextError =
        caught instanceof PdfSecurityError
          ? caught
          : new PdfSecurityError(
              "PROCESSING_FAILED",
              "PDF security processing failed. Please try another PDF.",
            );
      setError(nextError);
      throw nextError;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { run, cancel, reset, isProcessing, progress, error };
}
