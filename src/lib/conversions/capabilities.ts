import { getBackendEnvironment, getBackendStatus } from "@/lib/backend/env";
import {
  getConversionAdminControls,
  type ConversionAdminControl,
} from "./administration";
import {
  CONVERSION_REGISTRY,
  type ConversionCapabilityKey,
  type ConversionDefinition,
} from "./registry";
import { isLocalBrowserConversionId } from "./local-browser-conversions";

const CLIENT_CAPABILITIES = new Set<ConversionCapabilityKey>([
  "browser-pdf-render",
  "browser-pdf-text",
  "browser-pdf-ocr",
  "browser-image-pdf",
  "browser-text-pdf",
  "browser-structured-pdf",
]);

export interface PublicConversionCapability {
  readonly id: string;
  readonly route: string;
  readonly status: ConversionAdminControl["status"];
  readonly enabled: boolean;
  readonly hidden: boolean;
  readonly beta: boolean;
  readonly processingMode: ConversionDefinition["processingMode"];
  readonly capabilityKey: ConversionCapabilityKey;
  readonly disabledReason: string | null;
  readonly access: ConversionAdminControl["access"];
  readonly limits: {
    readonly maxFileSize: number;
    readonly maxPageCount: number | null;
    readonly batchLimit: number;
    readonly dailyLimit: number | null;
  };
}

function getEnabledCapabilities() {
  const enabled = new Set(CLIENT_CAPABILITIES);
  const backendStatus = getBackendStatus();
  if (
    !backendStatus.processingApiConfigured ||
    !backendStatus.supabaseAdminConfigured
  ) {
    return enabled;
  }

  const environment = getBackendEnvironment();
  for (const value of environment.processingCapabilities) {
    const matching = CONVERSION_REGISTRY.find(
      (conversion) => conversion.capabilityKey === value,
    );
    if (matching) enabled.add(matching.capabilityKey);
  }
  return enabled;
}

export function getPublicConversionCapabilities(): readonly PublicConversionCapability[] {
  const controls = new Map(
    getConversionAdminControls().map((control) => [
      control.conversionId,
      control,
    ]),
  );
  const enabledCapabilities = getEnabledCapabilities();

  return CONVERSION_REGISTRY.map((conversion) => {
    const control = controls.get(conversion.id);
    const locallyImplemented = isLocalBrowserConversionId(conversion.id);
    const capabilityEnabled = enabledCapabilities.has(
      conversion.capabilityKey,
    );
    const administrativelyBlocked =
      control?.hidden === true ||
      control?.status === "maintenance" ||
      control?.status === "disabled";
    const enabled = locallyImplemented
      ? !administrativelyBlocked
      : Boolean(control?.enabled && capabilityEnabled);
    const status = locallyImplemented && !administrativelyBlocked
      ? "available"
      : (control?.status ?? conversion.status);

    return {
      id: conversion.id,
      route: conversion.route,
      status,
      enabled,
      hidden: control?.hidden ?? false,
      beta: locallyImplemented ? false : (control?.beta ?? false),
      processingMode: locallyImplemented ? "client" : conversion.processingMode,
      capabilityKey: conversion.capabilityKey,
      disabledReason: enabled
        ? null
        : (control?.disabledReason ?? conversion.disabledReason),
      access: locallyImplemented ? "free" : (control?.access ?? conversion.access),
      limits: {
        maxFileSize: control?.maxFileSize ?? conversion.maxFileSize,
        maxPageCount: control?.maxPageCount ?? conversion.maxPageCount,
        batchLimit: control?.batchLimit ?? conversion.batchLimit,
        dailyLimit: locallyImplemented
          ? null
          : (control?.dailyLimit ?? conversion.dailyLimit),
      },
    };
  });
}

export function getPublicConversionCapability(id: string) {
  return getPublicConversionCapabilities().find(
    (capability) => capability.id === id,
  );
}
