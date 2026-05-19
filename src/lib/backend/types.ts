export type PdfMantraExecutionMode = "browser" | "backend" | "hybrid";

export type PdfMantraProcessingJobType =
  | "ocr_pdf"
  | "compress_pdf"
  | "pdf_to_word"
  | "word_to_pdf"
  | "protect_pdf"
  | "unlock_pdf"
  | "large_merge"
  | "large_split"
  | "server_export";

export type PdfMantraProcessingJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface PdfMantraDocumentRecord {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly originalFileName: string | null;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly pageCount: number | null;
  readonly storageBucket: string;
  readonly storagePath: string;
  readonly latestVersionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PdfMantraDocumentVersionRecord {
  readonly id: string;
  readonly documentId: string;
  readonly ownerId: string;
  readonly kind: "original" | "annotated" | "signed" | "processed" | "converted";
  readonly storageBucket: string;
  readonly storagePath: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: string;
}

export interface PdfMantraAnnotationProjectRecord {
  readonly id: string;
  readonly ownerId: string;
  readonly documentId: string | null;
  readonly title: string;
  readonly schemaVersion: number;
  readonly annotations: readonly unknown[];
  readonly viewportState: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PdfMantraSavedSignatureRecord {
  readonly id: string;
  readonly ownerId: string;
  readonly label: string;
  readonly signatureType: "drawn" | "typed" | "uploaded" | "initials";
  readonly payload: Record<string, unknown>;
  readonly storageBucket: string | null;
  readonly storagePath: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PdfMantraProcessingJobRecord {
  readonly id: string;
  readonly ownerId: string | null;
  readonly jobType: PdfMantraProcessingJobType;
  readonly status: PdfMantraProcessingJobStatus;
  readonly inputDocumentId: string | null;
  readonly inputVersionId: string | null;
  readonly outputDocumentId: string | null;
  readonly outputVersionId: string | null;
  readonly progress: number;
  readonly requestPayload: Record<string, unknown>;
  readonly resultPayload: Record<string, unknown>;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PdfMantraCreateProcessingJobInput {
  readonly jobType: PdfMantraProcessingJobType;
  readonly inputDocumentId?: string;
  readonly inputVersionId?: string;
  readonly requestPayload?: Record<string, unknown>;
}
