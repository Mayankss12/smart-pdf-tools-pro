import { randomUUID } from "node:crypto";

import {
  createCorsPreflightResponse,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import {
  assertWorkspaceCapacity,
  createWorkspaceStoragePath,
  isUuid,
  normalizeOptionalPageCount,
  normalizePositiveInteger,
  normalizeSha256,
  normalizeVersionKind,
  sanitizeVersionLabel,
} from "@/lib/workspace";
import { readWorkspaceJson, workspaceResponse } from "@/lib/workspace/api";
import {
  getOwnedDocument,
  getWorkspaceRequestContext,
  getWorkspaceUsage,
} from "@/lib/workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ documentId: string }> };

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "POST, OPTIONS");
}

export async function POST(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { documentId } = await routeContext.params;
  if (!isUuid(documentId)) return workspaceResponse(request, { ok: false, error: "Invalid document." }, 400);

  const body = await readWorkspaceJson(request);
  if (!body) return workspaceResponse(request, { ok: false, error: "Invalid request body." }, 400);

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user, quota, bucket } = result.context;

  const sizeBytes = normalizePositiveInteger(body.sizeBytes, quota.maximumFileBytes + 1);
  const checksumSha256 = normalizeSha256(body.checksumSha256);
  const pageCount = normalizeOptionalPageCount(body.pageCount);
  if (
    !sizeBytes ||
    body.mimeType !== "application/pdf" ||
    (body.checksumSha256 !== null && body.checksumSha256 !== undefined && !checksumSha256)
  ) {
    return workspaceResponse(request, { ok: false, error: "A valid PDF size, MIME type, and optional checksum are required." }, 400);
  }

  try {
    const [owned, usage, latestVersion] = await Promise.all([
      getOwnedDocument(admin, user.id, documentId),
      getWorkspaceUsage(admin, user.id),
      admin
        .from("document_versions")
        .select("version_number")
        .eq("document_id", documentId)
        .eq("owner_id", user.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (owned.error) throw owned.error;
    if (!owned.data || owned.data.status === "archived") {
      return workspaceResponse(request, { ok: false, error: "Document not found." }, 404);
    }
    if (latestVersion.error) throw latestVersion.error;

    const capacityError = assertWorkspaceCapacity({
      quota,
      usage,
      fileSizeBytes: sizeBytes,
      createsDocument: false,
    });
    if (capacityError) return workspaceResponse(request, { ok: false, error: capacityError }, 409);

    const versionNumber = Number(latestVersion.data?.version_number ?? 0) + 1;
    const versionId = randomUUID();
    const storagePath = createWorkspaceStoragePath({ ownerId: user.id, documentId, versionId });
    const kind = normalizeVersionKind(body.kind);
    const { error } = await admin.from("document_versions").insert({
      id: versionId,
      document_id: documentId,
      owner_id: user.id,
      kind,
      storage_bucket: bucket,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      checksum_sha256: checksumSha256,
      version_number: versionNumber,
      label: sanitizeVersionLabel(body.label) ?? `Version ${versionNumber}`,
      upload_status: "uploading",
      mime_type: "application/pdf",
      page_count: pageCount,
    });
    if (error) throw error;

    const signedUpload = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (signedUpload.error || !signedUpload.data?.token) {
      await admin
        .from("document_versions")
        .delete()
        .eq("id", versionId)
        .eq("owner_id", user.id);
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
          versionNumber,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Workspace version initialization failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to prepare this version upload." }, 500);
  }
}
