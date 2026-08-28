export type PdfStructuralOperation = "repair" | "flatten";

export type PdfStructuralWorkerRequest = {
  readonly id: string;
  readonly operation: PdfStructuralOperation;
  readonly input: ArrayBuffer;
};

export type PdfStructuralWorkerResponse =
  | {
      readonly id: string;
      readonly type: "progress";
      readonly progress: number;
      readonly message: string;
    }
  | {
      readonly id: string;
      readonly type: "success";
      readonly output: ArrayBuffer;
      readonly pageCount: number;
    }
  | {
      readonly id: string;
      readonly type: "error";
      readonly message: string;
    };

export function structuralOutputLabel(operation: PdfStructuralOperation) {
  return operation === "repair" ? "repaired" : "flattened";
}
