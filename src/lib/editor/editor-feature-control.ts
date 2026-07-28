import type {
  EditorBackendCapability,
  EditorFeatureControl,
} from "./editor-tool-registry";

export type EditorCapabilityResponse = {
  readonly configured: boolean;
  readonly backendCapabilities: Readonly<Record<EditorBackendCapability, boolean>>;
  readonly featureControl: EditorFeatureControl;
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseDisabledFlags(value: string | undefined) {
  const flags: Record<string, boolean> = {};

  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((flag) => {
      flags[flag] = false;
    });

  return flags;
}

export function getEditorFeatureControlFromEnvironment(): EditorFeatureControl {
  return {
    globalEditorEnabled: parseBoolean(
      process.env.NEXT_PUBLIC_PDFMANTRA_EDITOR_ENABLED,
      true,
    ),
    maintenanceMode: parseBoolean(
      process.env.NEXT_PUBLIC_PDFMANTRA_EDITOR_MAINTENANCE,
      false,
    ),
    flags: parseDisabledFlags(
      process.env.NEXT_PUBLIC_PDFMANTRA_EDITOR_DISABLED_FEATURES,
    ),
  };
}

export function getDefaultEditorCapabilities(): EditorCapabilityResponse {
  return {
    configured: false,
    backendCapabilities: {
      translation: false,
    },
    featureControl: getEditorFeatureControlFromEnvironment(),
  };
}
