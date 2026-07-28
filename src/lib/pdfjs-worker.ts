import type * as PdfJsLibrary from "pdfjs-dist";

type PdfJsWorkerLibrary = Pick<
  typeof PdfJsLibrary,
  "GlobalWorkerOptions"
>;

const SELF_HOSTED_PDFJS_WORKER = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function configurePdfJsWorker(pdfjs: PdfJsWorkerLibrary) {
  if (typeof window === "undefined") return;

  if (pdfjs.GlobalWorkerOptions.workerSrc !== SELF_HOSTED_PDFJS_WORKER) {
    pdfjs.GlobalWorkerOptions.workerSrc = SELF_HOSTED_PDFJS_WORKER;
  }
}
