import { getPublicConversionCapabilities } from "@/lib/conversions/capabilities";
import type {
  PublicLaunchCapabilitySnapshot,
  PublicLaunchCapabilityState,
} from "@/lib/public-launch";

export function getPublicLaunchCapabilitySnapshot(): PublicLaunchCapabilitySnapshot {
  return Object.fromEntries(
    getPublicConversionCapabilities().map((capability) => [
      capability.id,
      {
        enabled: capability.enabled,
        hidden: capability.hidden,
        beta: capability.beta,
        status: capability.status,
      } satisfies PublicLaunchCapabilityState,
    ]),
  );
}
