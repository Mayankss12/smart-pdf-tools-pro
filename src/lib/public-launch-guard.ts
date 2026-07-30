import { notFound } from "next/navigation";

import { isToolPubliclyLaunchReady } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";
import { getToolById } from "@/lib/tools";

export function requirePublicLaunchReadyTool(toolId: string) {
  const tool = getToolById(toolId);
  const capabilitySnapshot = getPublicLaunchCapabilitySnapshot();

  if (!tool || !isToolPubliclyLaunchReady(tool, capabilitySnapshot)) {
    notFound();
  }

  return tool;
}
