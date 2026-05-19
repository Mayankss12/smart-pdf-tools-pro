export interface PdfMantraBackendEnvironment {
  readonly supabaseUrl: string | null;
  readonly supabasePublishableKey: string | null;
  readonly supabaseSecretKey: string | null;
  readonly documentsBucket: string;
  readonly outputsBucket: string;
  readonly signaturesBucket: string;
  readonly processingApiBaseUrl: string | null;
}

export interface PdfMantraBackendStatus {
  readonly supabasePublicConfigured: boolean;
  readonly supabaseAdminConfigured: boolean;
  readonly storageConfigured: boolean;
  readonly processingApiConfigured: boolean;
}

function cleanEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getBackendEnvironment(): PdfMantraBackendEnvironment {
  return {
    supabaseUrl: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKey:
      cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseSecretKey: cleanEnvValue(process.env.SUPABASE_SECRET_KEY),
    documentsBucket: cleanEnvValue(process.env.PDFMANTRA_DOCUMENTS_BUCKET) ?? "pdf-documents",
    outputsBucket: cleanEnvValue(process.env.PDFMANTRA_OUTPUTS_BUCKET) ?? "pdf-outputs",
    signaturesBucket: cleanEnvValue(process.env.PDFMANTRA_SIGNATURES_BUCKET) ?? "pdf-signatures",
    processingApiBaseUrl: cleanEnvValue(process.env.PDFMANTRA_PROCESSING_API_BASE_URL),
  };
}

export function getBackendStatus(): PdfMantraBackendStatus {
  const env = getBackendEnvironment();
  const supabasePublicConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
  const supabaseAdminConfigured = Boolean(supabasePublicConfigured && env.supabaseSecretKey);

  return {
    supabasePublicConfigured,
    supabaseAdminConfigured,
    storageConfigured: supabaseAdminConfigured,
    processingApiConfigured: Boolean(env.processingApiBaseUrl),
  };
}

export function getSupabasePublicConfig(): {
  readonly url: string;
  readonly publishableKey: string;
} | null {
  const env = getBackendEnvironment();

  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    return null;
  }

  return {
    url: env.supabaseUrl,
    publishableKey: env.supabasePublishableKey,
  };
}

export function getSupabaseAdminConfig(): {
  readonly url: string;
  readonly secretKey: string;
} | null {
  const env = getBackendEnvironment();

  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    return null;
  }

  return {
    url: env.supabaseUrl,
    secretKey: env.supabaseSecretKey,
  };
}
