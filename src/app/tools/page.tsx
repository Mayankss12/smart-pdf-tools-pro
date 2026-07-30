import { Header } from "@/components/Header";
import { ToolsDirectoryClient } from "@/components/ToolsDirectoryClient";
import { getPublicToolsDirectory } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

export default function ToolsPage() {
  const capabilitySnapshot = getPublicLaunchCapabilitySnapshot();
  const launchReadyToolIds = getPublicToolsDirectory(
    capabilitySnapshot,
  ).map((tool) => tool.id);

  return (
    <>
      <Header />
      <ToolsDirectoryClient launchReadyToolIds={launchReadyToolIds} />
    </>
  );
}
