import {
  isToolPubliclyLaunchReady,
  type PublicLaunchCapabilitySnapshot,
} from "@/lib/public-launch";
import { getToolByHref, type Tool } from "@/lib/tools";

export const PUBLIC_FOOTER_TOOL_HREFS = [
  "/editor",
  "/tools/merge",
  "/tools/split",
  "/tools/compress",
  "/tools/highlight-pdf",
  "/tools/watermark",
  "/tools/images-to-pdf",
  "/tools/pdf-to-images",
  "/tools/page-numbers",
  "/tools/reorder",
] as const;

export function getPublicFooterTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
): Tool[] {
  const seen = new Set<string>();
  return PUBLIC_FOOTER_TOOL_HREFS.flatMap((href) => {
    const tool = getToolByHref(href);
    if (
      !tool ||
      seen.has(tool.id) ||
      !isToolPubliclyLaunchReady(tool, capabilitySnapshot)
    ) {
      return [];
    }
    seen.add(tool.id);
    return [tool];
  });
}
