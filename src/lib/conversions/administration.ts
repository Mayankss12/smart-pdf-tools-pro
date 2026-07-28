import {
  CONVERSION_REGISTRY,
  type ConversionAccess,
  type ConversionCapabilityKey,
  type ConversionDefinition,
  type ConversionStatus,
} from "./registry";

export interface ConversionAdminControl {
  readonly conversionId: string;
  readonly enabled: boolean;
  readonly hidden: boolean;
  readonly beta: boolean;
  readonly status: ConversionStatus;
  readonly access: ConversionAccess;
  readonly dailyLimit: number | null;
  readonly maxFileSize: number;
  readonly maxPageCount: number | null;
  readonly batchLimit: number;
  readonly capabilityKey: ConversionCapabilityKey;
  readonly disabledReason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is ConversionStatus {
  return (
    value === "available" ||
    value === "backend-required" ||
    value === "coming-soon" ||
    value === "maintenance" ||
    value === "disabled"
  );
}

function isAccess(value: unknown): value is ConversionAccess {
  return value === "free" || value === "pro" || value === "admin-only";
}

function optionalPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function parseOverrides() {
  const source = process.env.PDFMANTRA_CONVERSION_OVERRIDES_JSON?.trim();
  if (!source) return new Map<string, Record<string, unknown>>();

  try {
    const parsed: unknown = JSON.parse(source);
    if (!isRecord(parsed)) return new Map<string, Record<string, unknown>>();
    return new Map(
      Object.entries(parsed).filter(
        (entry): entry is [string, Record<string, unknown>] =>
          isRecord(entry[1]),
      ),
    );
  } catch {
    return new Map<string, Record<string, unknown>>();
  }
}

export function getConversionAdminControls(): readonly ConversionAdminControl[] {
  const overrides = parseOverrides();

  return CONVERSION_REGISTRY.map((conversion) => {
    const override = overrides.get(conversion.id);
    const status =
      override && isStatus(override.status)
        ? override.status
        : conversion.status;
    const enabled =
      typeof override?.enabled === "boolean"
        ? override.enabled
        : status === "available";

    return {
      conversionId: conversion.id,
      enabled,
      hidden:
        typeof override?.hidden === "boolean" ? override.hidden : false,
      beta: typeof override?.beta === "boolean" ? override.beta : false,
      status,
      access:
        override && isAccess(override.access)
          ? override.access
          : conversion.access,
      dailyLimit:
        optionalPositiveNumber(override?.dailyLimit) ??
        conversion.dailyLimit,
      maxFileSize:
        optionalPositiveNumber(override?.maxFileSize) ??
        conversion.maxFileSize,
      maxPageCount:
        optionalPositiveNumber(override?.maxPageCount) ??
        conversion.maxPageCount,
      batchLimit:
        optionalPositiveNumber(override?.batchLimit) ??
        conversion.batchLimit,
      capabilityKey: conversion.capabilityKey,
      disabledReason:
        typeof override?.disabledReason === "string"
          ? override.disabledReason
          : conversion.disabledReason,
    };
  });
}

export function getConversionAdminControl(
  conversion: ConversionDefinition,
) {
  return getConversionAdminControls().find(
    (control) => control.conversionId === conversion.id,
  );
}
