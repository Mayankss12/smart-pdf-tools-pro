import { getConversionById } from "@/lib/conversions/registry";
import { isLocalBrowserConversionId } from "@/lib/conversions/local-browser-conversions";
import {
  searchTools,
  sortToolsForDiscovery,
  tools,
  type Tool,
  type ToolCategory,
  type ToolSearchResult,
} from "@/lib/tools";

export type PublicLaunchCapabilityState = {
  readonly enabled: boolean;
  readonly hidden: boolean;
  readonly beta: boolean;
  readonly status: string;
};

export type PublicLaunchCapabilitySnapshot = Readonly<
  Record<string, PublicLaunchCapabilityState>
>;

export function isToolPubliclyLaunchReady(
  tool: Tool,
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): boolean {
  const locallyImplemented = isLocalBrowserConversionId(tool.id);
  if (tool.status !== "working" && !locallyImplemented) return false;

  const conversion = getConversionById(tool.id);
  if (!conversion) {
    return !tool.capabilities.needsBackendProcessing;
  }

  const capability = capabilitySnapshot[tool.id];
  if (!capability) return false;

  return (
    capability.enabled &&
    !capability.hidden &&
    !capability.beta &&
    capability.status === "available"
  );
}

export function getPublicLaunchReadyTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): Tool[] {
  return tools
    .filter((tool) => isToolPubliclyLaunchReady(tool, capabilitySnapshot))
    .sort(sortToolsForDiscovery);
}

export function getPublicToolsDirectory(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): Tool[] {
  return getPublicLaunchReadyTools(capabilitySnapshot).filter(
    (tool) => tool.visibility.showInToolsPage,
  );
}

export function getPublicMegaMenuTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): Tool[] {
  return getPublicLaunchReadyTools(capabilitySnapshot).filter(
    (tool) => tool.visibility.showInMegaMenu,
  );
}

export function getPublicSitemapTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): Tool[] {
  return getPublicLaunchReadyTools(capabilitySnapshot).filter(
    (tool) => tool.visibility.searchable,
  );
}

export function searchPublicLaunchTools(
  query: string,
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
  options: {
    readonly category?: ToolCategory;
    readonly limit?: number;
  } = {},
): ToolSearchResult[] {
  const results = searchTools(query, {
    category: options.category,
    includeComingSoon: false,
  }).filter((result) =>
    isToolPubliclyLaunchReady(result.tool, capabilitySnapshot),
  );

  return typeof options.limit === "number"
    ? results.slice(0, Math.max(0, Math.floor(options.limit)))
    : results;
}
