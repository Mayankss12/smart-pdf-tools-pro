import { createCorsPreflightResponse, isSameOriginRequest } from "@/lib/api-security";
import { isUuid, sanitizePdfFileName } from "@/lib/workspace";
import { workspaceResponse } from "@/lib/workspace/api";
import { getWorkspaceRequestContext } from "@/lib/workspace/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ versionId: string }> };

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "GET, OPTIONS");
}

export async function GET(request: Request, routeContext: Context) {
  if (!isSameOriginRequest(request)) {
    return workspaceResponse(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const { versionId } = await routeContext.params;
  if (!isUuid(versionId)) return workspaceResponse(request, { ok: false, error: "Invalid version." }, 400);

  const result = await getWorkspaceRequestContext();
  if ("error" in result) return workspaceResponse(request, { ok: false, error: result.error }, result.status);
  const { admin, user } = result.context;

  try {
    const versionQuery = await admin
      .from("document_versions")
      .select("id,document_id,storage_bucket,storage_path,upload_status,version_number")
      .eq("id", versionId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (versionQuery.error) throw versionQuery.error;
    if (!versionQuery.data || versionQuery.data.upload_status !== "ready") {
      return workspaceResponse(request, { ok: false, error: "Document version not found." }, 404);
    }

    const documentQuery = await admin
      .from("documents")
      .select("title")
      .eq("id", versionQuery.data.document_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (documentQuery.error) throw documentQuery.error;
    if (!documentQuery.data) return workspaceResponse(request, { ok: false, error: "Document not found." }, 404);

    const downloadName = sanitizePdfFileName(
      `${documentQuery.data.title}-v${versionQuery.data.version_number}.pdf`,
    );
    const signed = await admin.storage
      .from(versionQuery.data.storage_bucket)
      .createSignedUrl(versionQuery.data.storage_path, 60, { download: downloadName });
    if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Signed URL unavailable");

    return workspaceResponse(request, {
      ok: true,
      url: signed.data.signedUrl,
      expiresInSeconds: 60,
      fileName: downloadName,
    });
  } catch (error) {
    console.error("Workspace download failed", error);
    return workspaceResponse(request, { ok: false, error: "Unable to prepare this download." }, 500);
  }
}
