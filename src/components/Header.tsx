import { HeaderClient } from "@/components/HeaderClient";
import { getPublicLaunchReadyTools } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

export function Header() {
  const capabilitySnapshot = getPublicLaunchCapabilitySnapshot();
  const launchReadyToolIds = getPublicLaunchReadyTools(
    capabilitySnapshot,
  ).map((tool) => tool.id);

  return <HeaderClient launchReadyToolIds={launchReadyToolIds} />;
}
