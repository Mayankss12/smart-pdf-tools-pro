import type { PublicLaunchCapabilitySnapshot } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

export type HomepageCapabilitySnapshot = PublicLaunchCapabilitySnapshot;

export const getHomepageCapabilitySnapshot =
  getPublicLaunchCapabilitySnapshot;

