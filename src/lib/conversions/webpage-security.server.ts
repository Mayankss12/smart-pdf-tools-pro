import { lookup } from "node:dns/promises";

import {
  canonicalizeNetworkHostname,
  isLocalHostname,
  isNonPublicIpAddress,
  validatePublicWebpageUrl,
} from "./security";

const DNS_TIMEOUT_MS = 3_000;
const MAX_DNS_ADDRESSES = 16;

export type WebpageSecurityPolicy = {
  readonly version: 1;
  readonly hostname: string;
  readonly pinnedAddresses: readonly string[];
  readonly dnsPinningRequired: true;
  readonly redirectRevalidationRequired: true;
  readonly maxRedirects: 5;
};

export type WebpageAddressResolver = (
  hostname: string,
) => Promise<readonly string[]>;

async function defaultResolver(hostname: string) {
  const records = await lookup(hostname, {
    all: true,
    verbatim: true,
  });
  return records.map((record) => record.address);
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error("DNS_TIMEOUT")),
      timeoutMs,
    );
  });
  return Promise.race([operation, timedOut]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function validateAndResolvePublicWebpageUrl(
  value: string,
  options?: {
    readonly resolver?: WebpageAddressResolver;
    readonly timeoutMs?: number;
  },
): Promise<
  | {
      readonly allowed: true;
      readonly url: string;
      readonly policy: WebpageSecurityPolicy;
    }
  | { readonly allowed: false; readonly reason: string }
> {
  const initial = validatePublicWebpageUrl(value);
  if (initial.allowed === false) {
    return { allowed: false, reason: initial.reason };
  }

  const url = new URL(value);
  const hostname = canonicalizeNetworkHostname(url.hostname);
  if (isLocalHostname(hostname) || isNonPublicIpAddress(hostname)) {
    return {
      allowed: false,
      reason: "Local, private, link-local, and internal network URLs are blocked.",
    };
  }

  let addresses: readonly string[];
  try {
    addresses = await withTimeout(
      (options?.resolver ?? defaultResolver)(hostname),
      options?.timeoutMs ?? DNS_TIMEOUT_MS,
    );
  } catch {
    return {
      allowed: false,
      reason: "The webpage address could not be validated safely.",
    };
  }

  const canonicalAddresses = [
    ...new Set(
      addresses
        .slice(0, MAX_DNS_ADDRESSES + 1)
        .map(canonicalizeNetworkHostname),
    ),
  ];
  if (
    canonicalAddresses.length === 0 ||
    canonicalAddresses.length > MAX_DNS_ADDRESSES ||
    canonicalAddresses.some(isNonPublicIpAddress)
  ) {
    return {
      allowed: false,
      reason: "The webpage address is not available on the public network.",
    };
  }

  return {
    allowed: true,
    url: url.href,
    policy: {
      version: 1,
      hostname,
      pinnedAddresses: canonicalAddresses,
      dnsPinningRequired: true,
      redirectRevalidationRequired: true,
      maxRedirects: 5,
    },
  };
}
