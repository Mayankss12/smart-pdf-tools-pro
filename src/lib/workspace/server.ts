import type { User } from "@supabase/supabase-js";

import { getBackendEnvironment } from "@/lib/backend/env";
import { normalizeTier, type UserTier } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getWorkspaceQuota,
  type WorkspaceDocument,
  type WorkspaceDocumentStatus,
  type WorkspaceQuota,
  type WorkspaceUploadStatus,
  type WorkspaceUsage,
  type WorkspaceVersion,
  type WorkspaceVersionKind,
} from "@/lib/workspace";

type AdminClient = ReturnType<typeof createAdminClient>;

export type WorkspaceRequestContext = {
  user: User;
  admin: AdminClient;
  tier: UserTier;
  quota: WorkspaceQuota;
  bucket: string;
};

export type WorkspaceContextResult =
  | { ok: true; context: WorkspaceRequestContext }
  | { ok: false; status: number; error: string };

type DocumentRow = {
  id: string;
  title: string;
  original_file_name: string | null;
  status: WorkspaceDocumentStatus;
  size_bytes: number | string | null;
  page_count: number | null;
  checksum_sha256: string | null;
  source_tool: string | null;
  latest_version_id: string | null;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  document_id: string;
  version_number: number;
  label: string | null;
  kind: WorkspaceVersionKind;
  upload_status: WorkspaceUploadStatus;
  size_bytes: number | string | null;
  page_count: number | null;
  checksum_sha256: string | null;
  created_at: string;
};

export async function getWorkspaceRequestContext(): Promise<WorkspaceContextResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Account storage is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in to use your document workspace." };
  }

  try {
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("tier,tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    const tierExpired = Boolean(
      profile?.tier_expires_at && new Date(profile.tier_expires_at).getTime() <= Date.now(),
    );
    const tier = normalizeTier(tierExpired ? "free" : profile?.tier);

    return {
      ok: true,
      context: {
        user,
        admin,
        tier,
        quota: getWorkspaceQuota(tier),
        bucket: getBackendEnvironment().documentsBucket,
      },
    };
  } catch (error) {
    console.error("Workspace authentication failed", error);
    return { ok: false, status: 503, error: "Document workspace is temporarily unavailable." };
  }
}

export async function getWorkspaceUsage(
  admin: AdminClient,
  ownerId: string,
): Promise<WorkspaceUsage> {
  const [documentsResult, versionsResult] = await Promise.all([
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .in("status", ["uploading", "processing", "ready"]),
    admin
      .from("document_versions")
      .select("size_bytes", { count: "exact" })
      .eq("owner_id", ownerId)
      .neq("upload_status", "failed")
      .range(0, 24_999),
  ]);

  if (documentsResult.error) throw documentsResult.error;
  if (versionsResult.error) throw versionsResult.error;

  const versions = versionsResult.data ?? [];
  return {
    documentCount: documentsResult.count ?? 0,
    versionCount: versionsResult.count ?? versions.length,
    storageBytes: versions.reduce((total, row) => total + Number(row.size_bytes ?? 0), 0),
  };
}

export async function getOwnedDocument(
  admin: AdminClient,
  ownerId: string,
  documentId: string,
) {
  return admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
}

export async function getOwnedVersion(
  admin: AdminClient,
  ownerId: string,
  documentId: string,
  versionId: string,
) {
  return admin
    .from("document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("document_id", documentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
}

export async function recordWorkspaceEvent({
  admin,
  ownerId,
  documentId,
  versionId,
  eventType,
  metadata,
}: {
  admin: AdminClient;
  ownerId: string;
  documentId?: string | null;
  versionId?: string | null;
  eventType:
    | "document_created"
    | "version_created"
    | "version_restored"
    | "version_deleted"
    | "document_renamed"
    | "document_archived"
    | "document_deleted"
    | "upload_failed";
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const { error } = await admin.from("workspace_events").insert({
    owner_id: ownerId,
    document_id: documentId ?? null,
    version_id: versionId ?? null,
    event_type: eventType,
    actor_type: "user",
    metadata: metadata ?? {},
  });

  if (error) console.error("Workspace audit event failed", error);
}

export function mapWorkspaceDocuments(
  documents: DocumentRow[],
  versions: VersionRow[],
): WorkspaceDocument[] {
  const versionsByDocument = new Map<string, VersionRow[]>();
  for (const version of versions) {
    const existing = versionsByDocument.get(version.document_id) ?? [];
    existing.push(version);
    versionsByDocument.set(version.document_id, existing);
  }

  return documents.map((document) => {
    const mappedVersions: WorkspaceVersion[] = (versionsByDocument.get(document.id) ?? [])
      .sort((a, b) => b.version_number - a.version_number)
      .map((version) => ({
        id: version.id,
        documentId: version.document_id,
        versionNumber: version.version_number,
        label: version.label,
        kind: version.kind,
        uploadStatus: version.upload_status,
        sizeBytes: Number(version.size_bytes ?? 0),
        pageCount: version.page_count,
        checksumSha256: version.checksum_sha256,
        createdAt: version.created_at,
        isLatest: document.latest_version_id === version.id,
      }));

    return {
      id: document.id,
      title: document.title,
      originalFileName: document.original_file_name ?? "document.pdf",
      status: document.status,
      sizeBytes: Number(document.size_bytes ?? 0),
      pageCount: document.page_count,
      checksumSha256: document.checksum_sha256,
      sourceTool: document.source_tool,
      latestVersionId: document.latest_version_id,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      versions: mappedVersions,
    };
  });
}

export function isWorkspaceSchemaError(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42703" ||
        error.message?.includes("workspace_events") ||
        error.message?.includes("upload_status")),
  );
}
