import {
  createCorsPreflightResponse,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import { isUuid, sanitizeWorkspaceTitle } from "@/lib/workspace";
import { readWorkspaceJson, workspaceResponse } from "@/lib/workspace/api";
import {
  getOwnedDocument,
  getWorkspaceRequestContext,
  recordWorkspaceEvent,
} from "@/lib/workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ documentId: string }> };

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "PATCH, DELETE, OPTIONS");
}

export async function PATCH(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { documentId } = await routeContext.params;
  if (!isUuid(documentId)) return workspaceResponse(request, { ok: false, error: "Invalid document." }, 400);

  const body = await readWorkspaceJson(request);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return workspaceResponse(request, { ok: false, error: "Enter a document name." }, 400);
  }

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user } = result.context;

  try {
    const owned = await getOwnedDocument(admin, user.id, documentId);
    if (owned.error) throw owned.error;
    if (!owned.data || owned.data.status === "archived") {
      return workspaceResponse(request, { ok: false, error: "Document not found." }, 404);
    }

    const title = sanitizeWorkspaceTitle(body.title);
    const { error } = await admin
      .from("documents")
      .update({ title })
      .eq("id", documentId)
      .eq("owner_id", user.id);
    if (error) throw error;

    await recordWorkspaceEvent({
      admin,
      ownerId: user.id,
      documentId,
      eventType: "document_renamed",
      metadata: { previousTitle: owned.data.title, title },
    });
    return workspaceResponse(request, { ok: true, title });
  } catch (error) {
    console.error("Workspace rename failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to rename this document." }, 500);
  }
}

export async function DELETE(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { documentId } = await routeContext.params;
  if (!isUuid(documentId)) return workspaceResponse(request, { ok: false, error: "Invalid document." }, 400);

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user } = result.context;

  try {
    const owned = await getOwnedDocument(admin, user.id, documentId);
    if (owned.error) throw owned.error;
    if (!owned.data) return workspaceResponse(request, { ok: false, error: "Document not found." }, 404);

    const versions = await admin
      .from("document_versions")
      .select("storage_bucket,storage_path")
      .eq("document_id", documentId)
      .eq("owner_id", user.id);
    if (versions.error) throw versions.error;

    const ownedObjects = (versions.data ?? []).filter(
      (item) =>
        typeof item.storage_bucket === "string" &&
        typeof item.storage_path === "string" &&
        item.storage_path.startsWith(`${user.id}/`),
    );
    const pathsByBucket = new Map<string, string[]>();
    for (const object of ownedObjects) {
      const paths = pathsByBucket.get(object.storage_bucket) ?? [];
      paths.push(object.storage_path);
      pathsByBucket.set(object.storage_bucket, paths);
    }
    for (const [storageBucket, paths] of pathsByBucket) {
      const storage = await admin.storage.from(storageBucket).remove(paths);
      if (storage.error) throw storage.error;
    }

    const { error: deleteError } = await admin
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("owner_id", user.id);
    if (deleteError) throw deleteError;

    await recordWorkspaceEvent({
      admin,
      ownerId: user.id,
      documentId,
      eventType: "document_deleted",
      metadata: { title: owned.data.title, versionsDeleted: ownedObjects.length },
    });
    return workspaceResponse(request, { ok: true });
  } catch (error) {
    console.error("Workspace deletion failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to delete this document safely." }, 500);
  }
}
