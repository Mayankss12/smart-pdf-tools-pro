import {
  createCorsPreflightResponse,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import { isUuid } from "@/lib/workspace";
import { readWorkspaceJson, workspaceResponse } from "@/lib/workspace/api";
import {
  getOwnedDocument,
  getOwnedVersion,
  getWorkspaceRequestContext,
  recordWorkspaceEvent,
} from "@/lib/workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ documentId: string; versionId: string }> };

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "PATCH, DELETE, OPTIONS");
}

async function storageObjectExists({
  bucket,
  path,
  expectedSize,
  admin,
}: {
  bucket: string;
  path: string;
  expectedSize: number;
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
}) {
  const pieces = path.split("/");
  const fileName = pieces.pop();
  const folder = pieces.join("/");
  if (!fileName || !folder) return false;

  const { data, error } = await admin.storage.from(bucket).list(folder, {
    limit: 10,
    search: fileName,
  });
  if (error) throw error;

  const object = data?.find((item) => item.name === fileName);
  if (!object) return false;
  const storedSize = Number(object.metadata?.size ?? expectedSize);
  return Number.isFinite(storedSize) && storedSize === expectedSize;
}

export async function PATCH(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { documentId, versionId } = await routeContext.params;
  if (!isUuid(documentId) || !isUuid(versionId)) {
    return workspaceResponse(request, { ok: false, error: "Invalid document version." }, 400);
  }

  const body = await readWorkspaceJson(request);
  if (!body || (body.action !== "finalize" && body.action !== "restore" && body.action !== "fail")) {
    return workspaceResponse(request, { ok: false, error: "Invalid version action." }, 400);
  }

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user } = result.context;

  try {
    const [ownedDocument, ownedVersion] = await Promise.all([
      getOwnedDocument(admin, user.id, documentId),
      getOwnedVersion(admin, user.id, documentId, versionId),
    ]);
    if (ownedDocument.error) throw ownedDocument.error;
    if (ownedVersion.error) throw ownedVersion.error;
    if (!ownedDocument.data || !ownedVersion.data) {
      return workspaceResponse(request, { ok: false, error: "Document version not found." }, 404);
    }

    const document = ownedDocument.data;
    const version = ownedVersion.data;

    if (body.action === "fail") {
      if (version.upload_status === "uploading") {
        await admin.storage.from(version.storage_bucket).remove([version.storage_path]);
        await recordWorkspaceEvent({
          admin,
          ownerId: user.id,
          documentId,
          versionId,
          eventType: "upload_failed",
          metadata: { versionNumber: version.version_number },
        });
        if (!document.latest_version_id) {
          await admin.from("documents").delete().eq("id", documentId).eq("owner_id", user.id);
        } else {
          await admin
            .from("document_versions")
            .delete()
            .eq("id", versionId)
            .eq("owner_id", user.id);
        }
      }
      return workspaceResponse(request, { ok: true });
    }

    if (body.action === "restore") {
      if (version.upload_status !== "ready") {
        return workspaceResponse(request, { ok: false, error: "Only a completed version can be restored." }, 409);
      }

      const restorableObjectExists = await storageObjectExists({
        admin,
        bucket: version.storage_bucket,
        path: version.storage_path,
        expectedSize: Number(version.size_bytes),
      });
      if (!restorableObjectExists) {
        return workspaceResponse(request, { ok: false, error: "This stored version is no longer available." }, 409);
      }

      const { error } = await admin.rpc("restore_workspace_version", {
        target_owner: user.id,
        target_document: documentId,
        target_version: versionId,
      });
      if (error) throw error;

      await recordWorkspaceEvent({
        admin,
        ownerId: user.id,
        documentId,
        versionId,
        eventType: "version_restored",
        metadata: { versionNumber: version.version_number },
      });
      return workspaceResponse(request, { ok: true });
    }

    if (version.upload_status === "ready" && document.latest_version_id === version.id) {
      return workspaceResponse(request, { ok: true, alreadyFinalized: true });
    }
    if (version.upload_status !== "uploading") {
      return workspaceResponse(request, { ok: false, error: "This upload can no longer be finalized." }, 409);
    }

    const objectExists = await storageObjectExists({
      admin,
      bucket: version.storage_bucket,
      path: version.storage_path,
      expectedSize: Number(version.size_bytes),
    });
    if (!objectExists) {
      return workspaceResponse(
        request,
        { ok: false, error: "The uploaded PDF could not be verified. Please try again." },
        409,
      );
    }

    const { error: finalizeError } = await admin.rpc("finalize_workspace_version", {
      target_owner: user.id,
      target_document: documentId,
      target_version: versionId,
    });
    if (finalizeError) throw finalizeError;

    await recordWorkspaceEvent({
      admin,
      ownerId: user.id,
      documentId,
      versionId,
      eventType: Number(version.version_number) === 1 ? "document_created" : "version_created",
      metadata: { versionNumber: version.version_number, kind: version.kind },
    });

    return workspaceResponse(request, { ok: true });
  } catch (error) {
    console.error("Workspace version action failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to update this document version." }, 500);
  }
}

export async function DELETE(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { documentId, versionId } = await routeContext.params;
  if (!isUuid(documentId) || !isUuid(versionId)) {
    return workspaceResponse(request, { ok: false, error: "Invalid document version." }, 400);
  }

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user } = result.context;

  try {
    const [documentQuery, versionQuery, versionCountQuery] = await Promise.all([
      getOwnedDocument(admin, user.id, documentId),
      getOwnedVersion(admin, user.id, documentId, versionId),
      admin
        .from("document_versions")
        .select("id", { count: "exact", head: true })
        .eq("document_id", documentId)
        .eq("owner_id", user.id)
        .neq("upload_status", "failed"),
    ]);
    if (documentQuery.error) throw documentQuery.error;
    if (versionQuery.error) throw versionQuery.error;
    if (versionCountQuery.error) throw versionCountQuery.error;
    if (!documentQuery.data || !versionQuery.data) {
      return workspaceResponse(request, { ok: false, error: "Document version not found." }, 404);
    }
    if (documentQuery.data.latest_version_id === versionId) {
      return workspaceResponse(request, { ok: false, error: "Restore another version before deleting the current one." }, 409);
    }
    if ((versionCountQuery.count ?? 0) <= 1) {
      return workspaceResponse(request, { ok: false, error: "A document must keep at least one version." }, 409);
    }

    const storage = await admin.storage
      .from(versionQuery.data.storage_bucket)
      .remove([versionQuery.data.storage_path]);
    if (storage.error) throw storage.error;

    const deletion = await admin
      .from("document_versions")
      .delete()
      .eq("id", versionId)
      .eq("owner_id", user.id);
    if (deletion.error) throw deletion.error;

    await recordWorkspaceEvent({
      admin,
      ownerId: user.id,
      documentId,
      versionId,
      eventType: "version_deleted",
      metadata: { versionNumber: versionQuery.data.version_number },
    });
    return workspaceResponse(request, { ok: true });
  } catch (error) {
    console.error("Workspace version deletion failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to delete this version safely." }, 500);
  }
}
