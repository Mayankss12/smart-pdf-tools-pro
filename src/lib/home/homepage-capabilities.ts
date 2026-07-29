import {
  getPublicConversionCapabilities,
  type PublicConversionCapability,
} from "@/lib/conversions/capabilities";
import { getConversionById } from "@/lib/conversions/registry";
import type { Tool, ToolStatus } from "@/lib/tools";

export type HomepageCapabilityState = {
  readonly enabled: boolean;
  readonly status: ToolStatus;
  readonly processingMode: "browser" | "provider";
  readonly label: "Browser" | "Secure provider";
  readonly disabledReason: string | null;
};

export type HomepageCapabilitySnapshot = Readonly<
  Record<string, HomepageCapabilityState>
>;

function toToolStatus(
  capability: PublicConversionCapability,
): ToolStatus {
  if (capability.enabled) return capability.beta ? "beta" : "working";
  if (capability.processingMode === "provider") return "backend-required";
  if (capability.status === "maintenance") return "beta";
  return capability.status === "coming-soon"
    ? "coming-soon"
    : "backend-required";
}

export function getHomepageCapabilitySnapshot(): HomepageCapabilitySnapshot {
  return Object.fromEntries(
    getPublicConversionCapabilities().map((capability) => [
      capability.id,
      {
        enabled: capability.enabled,
        status: toToolStatus(capability),
        processingMode:
          capability.processingMode === "client" ? "browser" : "provider",
        label:
          capability.processingMode === "client"
            ? "Browser"
            : "Secure provider",
        disabledReason: capability.disabledReason,
      } satisfies HomepageCapabilityState,
    ]),
  );
}

export function getHomepageToolCapability(
  tool: Tool,
  snapshot: HomepageCapabilitySnapshot,
): HomepageCapabilityState {
  const conversion = getConversionById(tool.id);
  if (conversion && snapshot[tool.id]) return snapshot[tool.id];
  const browser = tool.capabilities.processingMode === "browser";
  return {
    enabled: tool.status === "working" || tool.status === "beta",
    status: tool.status,
    processingMode: browser ? "browser" : "provider",
    label: browser ? "Browser" : "Secure provider",
    disabledReason:
      tool.status === "working" || tool.status === "beta"
        ? null
        : tool.menuDescription,
  };
}

