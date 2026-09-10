import { randomUUID } from "node:crypto";

import {
  createCorsPreflightResponse,
  isSameOriginRequest,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import {
  assertWorkspaceCapacity,
  createWorkspaceStoragePath,
  normalizeOptionalPageCount,
  normalizePositiveInteger,
  normalizeSha256,
  sanitizePdfFileName,
  sanitizeWorkspaceTitle,
} from "@/lib/workspace";
import {
  assertGlobalWorkspaceCapacity,
  getWorkspaceStorageCapacityBytes,
} from "@/lib/operations";
import {
  readWorkspaceJson,
  workspaceResponse,
  workspaceSchemaUnavailable,
} from "@/lib/workspace/api";
import {
  getWorkspaceRequestContext,
  getWorkspaceUsage,
  isWorkspaceSchemaError,
  mapWorkspaceDocuments,
} from "@/lib/workspace/server";
import { getGlobalWorkspaceStorageUsage } from "@/lib/operations/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "GET, POST, OPTIONS");
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);

  const { admin, user, quota, tier } = result.context;
  try {
    const [documentsQuery, versionsQuery, usage] = await Promise.all([
      admin
        .from("documents")
        .select(
          "id,title,original_file_name,status,size_bytes,page_count,checksum_sha256,source_tool,latest_version_id,created_at,updated_at",
        )
        .eq("owner_id", user.id)
        .in("status", ["uploading", "processing", "ready"])
        .order("updated_at", { ascending: false })
        .limit(quota.maximumDocuments),
      admin
        .from("document_versions")
        .select(
          "id,document_id,version_number,label,kind,upload_status,size_bytes,page_count,checksum_sha256,created_at",
        )
        .eq("owner_id", user.id)
        .order("version_number", { ascending: false })
        .limit(quota.maximumVersions),
      getWorkspaceUsage(admin, user.id),
    ]);

    if (documentsQuery.error) throw documentsQuery.error;
    if (versionsQuery.error) throw versionsQuery.error;

    return workspaceResponse(request, {
      ok: true,
      tier,
      quota,
      usage,
      documents: mapWorkspaceDocuments(
        (documentsQuery.data ?? []) as never[],
        (versionsQuery.data ?? []) as never[],
      ),
    });
  } catch (error) {
    console.error("Workspace listing failed", error);
    if (isWorkspaceSchemaError(error as { code?: string; message?: string })) {
      return workspaceSchemaUnavailable(request);
    }
    return workspaceResponse(request, { ok: false, error: "Unable to load your documents." }, 500);
  }
}

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const body = await readWorkspaceJson(request);
  if (!body) return workspaceResponse(request, { ok: false, error: "Invalid request body." }, 400);

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);

  const { admin, user, quota, bucket } = result.context;
  const originalFileName = sanitizePdfFileName(body.originalFileName);
  const sizeBytes = normalizePositiveInteger(body.sizeBytes, quota.maximumFileBytes + 1);
  const pageCount = normalizeOptionalPageCount(body.pageCount);
  const checksumSha256 = normalizeSha256(body.checksumSha256);

  if (
    !sizeBytes ||
    body.mimeType !== "application/pdf" ||
    (body.checksumSha256 !== null && body.checksumSha256 !== undefined && !checksumSha256)
  ) {
    return workspaceResponse(
      request,
      { ok: false, error: "A valid PDF size, MIME type, and optional SHA-256 checksum are required." },
      400,
    );
  }

  const documentId = randomUUID();
  const versionId = randomUUID();
  const storagePath = createWorkspaceStoragePath({ ownerId: user.id, documentId, versionId });

  try {
    const [usage, globalStorageBytes] = await Promise.all([
      getWorkspaceUsage(admin, user.id),
      getGlobalWorkspaceStorageUsage(admin),
    ]);
    const capacityError = assertWorkspaceCapacity({
      quota,
      usage,
      fileSizeBytes: sizeBytes,
      createsDocument: true,
    });
    if (capacityError) return workspaceResponse(request, { ok: false, error: capacityError }, 409);
    const infrastructureCapacityError = assertGlobalWorkspaceCapacity({
      storageBytes: globalStorageBytes,
      incomingBytes: sizeBytes,
      storageCapacityBytes: getWorkspaceStorageCapacityBytes(),
    });
    if (infrastructureCapacityError) {
      return workspaceResponse(request, { ok: false, error: infrastructureCapacityError }, 503);
    }

    const { error: documentError } = await admin.from("documents").insert({
      id: documentId,
      owner_id: user.id,
      title: sanitizeWorkspaceTitle(body.title, originalFileName.replace(/\.pdf$/i, "")),
      original_file_name: originalFileName,
      mime_type: "application/pdf",
      size_bytes: sizeBytes,
      page_count: pageCount,
      storage_bucket: bucket,
      storage_path: storagePath,
      status: "uploading",
      checksum_sha256: checksumSha256,
      source_tool: typeof body.sourceTool === "string" ? body.sourceTool.slice(0, 80) : "workspace",
    });
    if (documentError) throw documentError;

    const { error: versionError } = await admin.from("document_versions").insert({
      id: versionId,
      document_id: documentId,
      owner_id: user.id,
      kind: "original",
      storage_bucket: bucket,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      checksum_sha256: checksumSha256,
      version_number: 1,
      label: "Original",
      upload_status: "uploading",
      mime_type: "application/pdf",
      page_count: pageCount,
    });
    if (versionError) {
      await admin.from("documents").delete().eq("id", documentId).eq("owner_id", user.id);
      throw versionError;
    }

    const signedUpload = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (signedUpload.error || !signedUpload.data?.token) {
      await admin.from("documents").delete().eq("id", documentId).eq("owner_id", user.id);
      throw signedUpload.error ?? new Error("Signed upload ticket unavailable");
    }

    return workspaceResponse(
      request,
      {
        ok: true,
        upload: {
          bucket,
          path: storagePath,
          token: signedUpload.data.token,
          documentId,
          versionId,
          maximumFileBytes: quota.maximumFileBytes,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Workspace upload initialization failed", error);
    if (isWorkspaceSchemaError(error as { code?: string; message?: string })) {
      return workspaceSchemaUnavailable(request);
    }
    return workspaceResponse(request, { ok: false, error: "Unable to prepare this document upload." }, 500);
  }
}
