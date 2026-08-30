import { getEntitlementPlan, normalizeTier, type UserTier } from "@/lib/entitlements";

const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

export const WORKSPACE_DOCUMENTS_BUCKET = "pdf-documents";
export const WORKSPACE_MAX_TITLE_LENGTH = 120;
export const WORKSPACE_MAX_VERSION_LABEL_LENGTH = 80;

export type WorkspaceDocumentStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type WorkspaceUploadStatus = "uploading" | "ready" | "failed";

export type WorkspaceVersionKind =
  | "original"
  | "annotated"
  | "signed"
  | "processed"
  | "converted";

export type WorkspaceQuota = {
  tier: UserTier;
  maximumDocuments: number;
  maximumVersions: number;
  maximumStorageBytes: number;
  maximumFileBytes: number;
};

export type WorkspaceUsage = {
  documentCount: number;
  versionCount: number;
  storageBytes: number;
};

export type WorkspaceVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  label: string | null;
  kind: WorkspaceVersionKind;
  uploadStatus: WorkspaceUploadStatus;
  sizeBytes: number;
  pageCount: number | null;
  checksumSha256: string | null;
  createdAt: string;
  isLatest: boolean;
};

export type WorkspaceDocument = {
  id: string;
  title: string;
  originalFileName: string;
  status: WorkspaceDocumentStatus;
  sizeBytes: number;
  pageCount: number | null;
  checksumSha256: string | null;
  sourceTool: string | null;
  latestVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: WorkspaceVersion[];
};

const ACCOUNT_QUOTAS: Record<Exclude<UserTier, "guest">, Omit<WorkspaceQuota, "tier">> = {
  free: {
    maximumDocuments: 10,
    maximumVersions: 25,
    maximumStorageBytes: 250 * MEBIBYTE,
    maximumFileBytes: 100 * MEBIBYTE,
  },
  plus: {
    maximumDocuments: 100,
    maximumVersions: 500,
    maximumStorageBytes: 500 * MEBIBYTE,
    maximumFileBytes: 500 * MEBIBYTE,
  },
  pro: {
    maximumDocuments: 500,
    maximumVersions: 2_500,
    maximumStorageBytes: 1 * GIBIBYTE,
    maximumFileBytes: 1 * GIBIBYTE,
  },
  admin: {
    maximumDocuments: 5_000,
    maximumVersions: 25_000,
    maximumStorageBytes: 1 * GIBIBYTE,
    maximumFileBytes: 1 * GIBIBYTE,
  },
};

export function getWorkspaceQuota(tierValue: string | null | undefined): WorkspaceQuota {
  const normalizedTier = normalizeTier(tierValue);
  const tier = normalizedTier === "guest" ? "free" : normalizedTier;
  const entitlementFileLimit = getEntitlementPlan(tier).maxFileSizeMb * MEBIBYTE;
  const quota = ACCOUNT_QUOTAS[tier];

  return {
    tier,
    ...quota,
    maximumFileBytes: Math.min(quota.maximumFileBytes, entitlementFileLimit),
  };
}

export function sanitizeWorkspaceTitle(value: unknown, fallback = "Untitled PDF") {
  if (typeof value !== "string") return fallback;

  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.slice(0, WORKSPACE_MAX_TITLE_LENGTH) || fallback;
}

export function sanitizeVersionLabel(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, WORKSPACE_MAX_VERSION_LABEL_LENGTH) : null;
}

export function sanitizePdfFileName(value: unknown) {
  const fallback = "document.pdf";
  if (typeof value !== "string") return fallback;

  const basename = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!basename) return fallback;

  const safe = basename.replace(/[^a-zA-Z0-9._() -]/g, "-").slice(0, 160);
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe || "document"}.pdf`;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function normalizeSha256(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null;
}

export function normalizePositiveInteger(value: unknown, maximum: number) {
  const numeric = typeof value === "number" ? value : Number.NaN;
  if (!Number.isSafeInteger(numeric) || numeric <= 0 || numeric > maximum) return null;
  return numeric;
}

export function normalizeOptionalPageCount(value: unknown) {
  if (value === null || value === undefined) return null;
  return normalizePositiveInteger(value, 100_000);
}

export function normalizeVersionKind(value: unknown): WorkspaceVersionKind {
  if (
    value === "annotated" ||
    value === "signed" ||
    value === "processed" ||
    value === "converted"
  ) {
    return value;
  }

  return "processed";
}

export function createWorkspaceStoragePath({
  ownerId,
  documentId,
  versionId,
}: {
  ownerId: string;
  documentId: string;
  versionId: string;
}) {
  if (!isUuid(ownerId) || !isUuid(documentId) || !isUuid(versionId)) {
    throw new Error("Workspace storage path requires valid UUIDs.");
  }

  return `${ownerId}/${documentId}/${versionId}.pdf`;
}

export function assertWorkspaceCapacity({
  quota,
  usage,
  fileSizeBytes,
  createsDocument,
}: {
  quota: WorkspaceQuota;
  usage: WorkspaceUsage;
  fileSizeBytes: number;
  createsDocument: boolean;
}) {
  if (fileSizeBytes > quota.maximumFileBytes) {
    return `This PDF exceeds the ${formatBytes(quota.maximumFileBytes)} per-file workspace limit.`;
  }
  if (createsDocument && usage.documentCount >= quota.maximumDocuments) {
    return `Your workspace has reached its ${quota.maximumDocuments} document limit.`;
  }
  if (usage.versionCount >= quota.maximumVersions) {
    return `Your workspace has reached its ${quota.maximumVersions} version limit.`;
  }
  if (usage.storageBytes + fileSizeBytes > quota.maximumStorageBytes) {
    return `This upload would exceed your ${formatBytes(quota.maximumStorageBytes)} workspace storage limit.`;
  }

  return null;
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value >= GIBIBYTE) return `${(value / GIBIBYTE).toFixed(value >= 10 * GIBIBYTE ? 0 : 1)} GB`;
  if (value >= MEBIBYTE) return `${(value / MEBIBYTE).toFixed(value >= 10 * MEBIBYTE ? 0 : 1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round(value)} B`;
}
