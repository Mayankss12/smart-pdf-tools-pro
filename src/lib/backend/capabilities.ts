import { getBackendEnvironment, getBackendStatus } from "@/lib/backend/env";

export type PdfMantraBackendCapabilityKey =
  | "accounts"
  | "document-library"
  | "annotation-projects"
  | "saved-signatures"
  | "processing-jobs"
  | "premium-usage";

export interface PdfMantraBackendCapability {
  readonly key: PdfMantraBackendCapabilityKey;
  readonly label: string;
  readonly enabled: boolean;
  readonly reason: string;
}

export interface PdfMantraBackendCapabilityReport {
  readonly configured: boolean;
  readonly supabasePublicConfigured: boolean;
  readonly supabaseAdminConfigured: boolean;
  readonly processingApiConfigured: boolean;
  readonly storageBuckets: {
    readonly documents: string;
    readonly outputs: string;
    readonly signatures: string;
  };
  readonly capabilities: readonly PdfMantraBackendCapability[];
}

export function getBackendCapabilityReport(): PdfMantraBackendCapabilityReport {
  const environment = getBackendEnvironment();
  const status = getBackendStatus();
  const publicReady = status.supabasePublicConfigured;
  const adminReady = status.supabaseAdminConfigured;
  const workerReady = status.processingApiConfigured;

  return {
    configured: publicReady,
    supabasePublicConfigured: publicReady,
    supabaseAdminConfigured: adminReady,
    processingApiConfigured: workerReady,
    storageBuckets: {
      documents: environment.documentsBucket,
      outputs: environment.outputsBucket,
      signatures: environment.signaturesBucket,
    },
    capabilities: [
      {
        key: "accounts",
        label: "Supabase Auth and user session support",
        enabled: publicReady,
        reason: publicReady
          ? "Supabase public configuration is available."
          : "Add Supabase public environment values before enabling account flows.",
      },
      {
        key: "document-library",
        label: "Saved PDF document library",
        enabled: adminReady,
        reason: adminReady
          ? "Server-side storage and metadata operations can be enabled."
          : "Server-side Supabase configuration is required for controlled document storage.",
      },
      {
        key: "annotation-projects",
        label: "Save and reopen annotation projects",
        enabled: publicReady,
        reason: publicReady
          ? "Authenticated projects can be persisted after the schema is applied."
          : "Supabase public configuration is required before project persistence.",
      },
      {
        key: "saved-signatures",
        label: "Reusable signatures and initials",
        enabled: publicReady,
        reason: publicReady
          ? "Saved signature records can be connected after the schema is applied."
          : "Supabase public configuration is required before signature persistence.",
      },
      {
        key: "processing-jobs",
        label: "OCR, compression, conversion, and queue jobs",
        enabled: workerReady,
        reason: workerReady
          ? "External processing API endpoint is configured."
          : "Set a processing API base URL when the worker service is ready.",
      },
      {
        key: "premium-usage",
        label: "Usage counters and premium gating",
        enabled: publicReady,
        reason: publicReady
          ? "Database-backed usage tracking can be connected after the schema is applied."
          : "Supabase configuration is required before usage tracking.",
      },
    ],
  };
}
