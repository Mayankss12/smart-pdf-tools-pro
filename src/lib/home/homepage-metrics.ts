import { CONVERSION_REGISTRY } from "@/lib/conversions/registry";
import { EDITOR_TOOL_DEFINITIONS } from "@/lib/editor/editor-tool-registry";
import { tools } from "@/lib/tools";

export function getHomepageProductMetrics() {
  return {
    browserTools: tools.filter(
      (tool) =>
        tool.status === "working" &&
        tool.capabilities.processingMode === "browser",
    ).length,
    conversionWorkflows: CONVERSION_REGISTRY.length,
    editorCapabilities: EDITOR_TOOL_DEFINITIONS.filter(
      (definition) =>
        definition.visible &&
        definition.group !== "actions" &&
        definition.id !== "select",
    ).length,
  };
}

