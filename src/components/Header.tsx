import { HeaderClient } from "@/components/HeaderClient";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

export function Header() {
  const capabilitySnapshot = getPublicLaunchCapabilitySnapshot();

  return <HeaderClient capabilities={capabilitySnapshot} />;
}
