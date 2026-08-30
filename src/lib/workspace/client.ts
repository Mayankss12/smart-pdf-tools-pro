"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { WorkspaceVersionKind } from "@/lib/workspace";

type UploadTicket = {
  bucket: string;
  path: string;
  token: string;
  documentId: string;
  versionId: string;
  versionNumber?: number;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !body) {
    throw new Error(body?.error ?? "The document workspace request failed.");
  }
  return body;
}

export async function inspectWorkspacePdf(file: File) {
  if (!file.size) throw new Error("This PDF is empty.");
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (
    header.length < 5 ||
    header[0] !== 0x25 ||
    header[1] !== 0x50 ||
    header[2] !== 0x44 ||
    header[3] !== 0x46 ||
    header[4] !== 0x2d
  ) {
    throw new Error("Choose a valid PDF file.");
  }

  let pageCount: number | null = null;
  let checksumSha256: string | null = null;
  if (file.size <= 128 * 1024 * 1024) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const { PDFDocument } = await import("pdf-lib");
      const document = await PDFDocument.load(bytes, { updateMetadata: false });
      pageCount = document.getPageCount();
    } catch {
      // Private storage accepts encrypted or unusual PDFs. Page count is best effort.
    }

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    checksumSha256 = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
  }

  return { pageCount, checksumSha256 };
}

export async function uploadWorkspacePdf({
  file,
  documentId,
  title,
  label,
  kind = "processed",
  sourceTool = "workspace",
}: {
  file: File;
  documentId?: string;
  title?: string;
  label?: string;
  kind?: WorkspaceVersionKind;
  sourceTool?: string;
}) {
  const { pageCount, checksumSha256 } = await inspectWorkspacePdf(file);
  const endpoint = documentId
    ? `/api/workspace/documents/${encodeURIComponent(documentId)}/versions`
    : "/api/workspace/documents";
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      originalFileName: file.name,
      mimeType: "application/pdf",
      sizeBytes: file.size,
      pageCount,
      checksumSha256,
      label,
      kind,
      sourceTool,
    }),
  });
  const initialized = await readJsonResponse<{ ok: true; upload: UploadTicket }>(response);
  const ticket = initialized.upload;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Account storage is not configured.");

  try {
    const upload = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
    });
    if (upload.error) throw upload.error;

    const finalize = await fetch(
      `/api/workspace/documents/${encodeURIComponent(ticket.documentId)}/versions/${encodeURIComponent(ticket.versionId)}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      },
    );
    await readJsonResponse<{ ok: true }>(finalize);
    return ticket;
  } catch (error) {
    await fetch(
      `/api/workspace/documents/${encodeURIComponent(ticket.documentId)}/versions/${encodeURIComponent(ticket.versionId)}`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "fail" }),
      },
    ).catch(() => undefined);
    throw error;
  }
}
