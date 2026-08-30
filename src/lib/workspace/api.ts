import { NextResponse } from "next/server";

import { createNoStoreHeaders } from "@/lib/api-security";

export function workspaceResponse(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: createNoStoreHeaders(request),
  });
}

export async function readWorkspaceJson(request: Request, maximumBytes = 16_384) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumBytes) return null;

  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function workspaceSchemaUnavailable(request: Request) {
  return workspaceResponse(
    request,
    {
      ok: false,
      error: "Document workspace needs its database migration before it can be used.",
      code: "WORKSPACE_MIGRATION_REQUIRED",
    },
    503,
  );
}
