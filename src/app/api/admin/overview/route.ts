import { NextResponse } from "next/server";

import { requireAdminIdentity } from "@/lib/admin/access";
import { createNoStoreHeaders } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAdminIdentity();

  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status, headers: createNoStoreHeaders(request) },
    );
  }

  return NextResponse.json(
    { ok: true, admin: access.identity },
    { headers: createNoStoreHeaders(request) },
  );
}
