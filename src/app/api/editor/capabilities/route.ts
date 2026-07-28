import { NextResponse } from "next/server";

import { getEditorFeatureControlFromEnvironment } from "@/lib/editor/editor-feature-control";
import { isTranslationProviderConfigured } from "@/lib/translation/provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const translation = isTranslationProviderConfigured();

  return NextResponse.json(
    {
      configured: translation,
      backendCapabilities: {
        translation,
      },
      featureControl: getEditorFeatureControlFromEnvironment(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
