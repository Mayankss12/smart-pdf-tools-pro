export type UserTier = "guest" | "free" | "plus" | "pro" | "admin";

export type EntitlementPlan = {
  tier: UserTier;
  label: string;
  dailyCleanExportLimit: number;
  maxFileSizeMb: number;
  maxPagesPerFile: number;
  canExportClean: boolean;
  canUseCoreTools: boolean;
  canUseAdvancedTools: boolean;
  canUseBackendTools: boolean;
  canUseBatchTools: boolean;
  showsUpgradePrompt: boolean;
};

export const PDFMANTRA_TIERS: Record<UserTier, EntitlementPlan> = {
  guest: {
    tier: "guest",
    label: "Guest",
    dailyCleanExportLimit: 1,
    maxFileSizeMb: 50,
    maxPagesPerFile: 50,
    canExportClean: true,
    canUseCoreTools: true,
    canUseAdvancedTools: false,
    canUseBackendTools: false,
    canUseBatchTools: false,
    showsUpgradePrompt: true,
  },

  free: {
    tier: "free",
    label: "Free",
    dailyCleanExportLimit: 5,
    maxFileSizeMb: 100,
    maxPagesPerFile: 100,
    canExportClean: true,
    canUseCoreTools: true,
    canUseAdvancedTools: false,
    canUseBackendTools: false,
    canUseBatchTools: false,
    showsUpgradePrompt: true,
  },

  plus: {
    tier: "plus",
    label: "PDFMantra Plus",
    dailyCleanExportLimit: 999999,
    maxFileSizeMb: 500,
    maxPagesPerFile: 500,
    canExportClean: true,
    canUseCoreTools: true,
    canUseAdvancedTools: true,
    canUseBackendTools: false,
    canUseBatchTools: false,
    showsUpgradePrompt: false,
  },

  pro: {
    tier: "pro",
    label: "PDFMantra Pro",
    dailyCleanExportLimit: 999999,
    maxFileSizeMb: 1024,
    maxPagesPerFile: 1000,
    canExportClean: true,
    canUseCoreTools: true,
    canUseAdvancedTools: true,
    canUseBackendTools: true,
    canUseBatchTools: true,
    showsUpgradePrompt: false,
  },

  admin: {
    tier: "admin",
    label: "Admin",
    dailyCleanExportLimit: 999999,
    maxFileSizeMb: 2048,
    maxPagesPerFile: 2000,
    canExportClean: true,
    canUseCoreTools: true,
    canUseAdvancedTools: true,
    canUseBackendTools: true,
    canUseBatchTools: true,
    showsUpgradePrompt: false,
  },
};

export const PDFMANTRA_PRICING = {
  plus: {
    monthlyInr: 99,
    yearlyInr: 999,
  },
  pro: {
    monthlyInr: 249,
    yearlyInr: 2499,
  },
} as const;

export const CORE_TOOL_KEYS = [
  "merge",
  "split",
  "compress",
  "reorder",
  "delete-pages",
  "extract",
  "rotate",
  "images-to-pdf",
  "pdf-to-images",
  "page-numbers",
  "watermark",
  "fill-sign",
] as const;

export const ADVANCED_TOOL_KEYS = [
  "editor",
  "protect",
  "unlock",
  "redact",
  "watermark-remover",
] as const;

export const BACKEND_TOOL_KEYS = [
  "ocr",
  "pdf-to-word",
] as const;

export type CoreToolKey = (typeof CORE_TOOL_KEYS)[number];
export type AdvancedToolKey = (typeof ADVANCED_TOOL_KEYS)[number];
export type BackendToolKey = (typeof BACKEND_TOOL_KEYS)[number];

export function normalizeTier(value: string | null | undefined): UserTier {
  if (
    value === "guest" ||
    value === "free" ||
    value === "plus" ||
    value === "pro" ||
    value === "admin"
  ) {
    return value;
  }

  return "free";
}

export function getEntitlementPlan(tier: string | null | undefined) {
  return PDFMANTRA_TIERS[normalizeTier(tier)];
}

export function isUnlimitedPlan(tier: string | null | undefined) {
  const normalizedTier = normalizeTier(tier);

  return normalizedTier === "plus" || normalizedTier === "pro" || normalizedTier === "admin";
}

export function getDailyCleanExportLimit(tier: string | null | undefined) {
  return getEntitlementPlan(tier).dailyCleanExportLimit;
}

export function canUseToolByTier({
  tier,
  toolKey,
}: {
  tier: string | null | undefined;
  toolKey: string;
}) {
  const plan = getEntitlementPlan(tier);

  if ((CORE_TOOL_KEYS as readonly string[]).includes(toolKey)) {
    return plan.canUseCoreTools;
  }

  if ((ADVANCED_TOOL_KEYS as readonly string[]).includes(toolKey)) {
    return plan.canUseAdvancedTools;
  }

  if ((BACKEND_TOOL_KEYS as readonly string[]).includes(toolKey)) {
    return plan.canUseBackendTools;
  }

  return false;
}
