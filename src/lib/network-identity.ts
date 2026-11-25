import { createHmac } from "node:crypto";

// Identifies the network a request comes from without keeping the address.
// The id is a keyed hash, so the stored value cannot be turned back into an IP,
// and it cannot be guessed without the server secret.
//
// The address is taken from x-forwarded-for, which the hosting platform sets
// from the real connection. If the app is ever served without such a proxy,
// that header would be client-controlled and this limit would be bypassable.

const NETWORK_ID_PREFIX = "ip_";
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HEXTET = /^[0-9a-f]{1,4}$/;

function normalizeIpv4(value: string) {
  const match = IPV4.exec(value);
  if (!match) return null;

  const octets = match.slice(1).map(Number);
  return octets.every((octet) => octet <= 255) ? octets.join(".") : null;
}

// IPv6 users hold a whole /64, so rotating inside it must not reset the limit.
function normalizeIpv6Prefix(value: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(value);
  if (mapped) return normalizeIpv4(mapped[1]);

  const halves = value.toLowerCase().split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;

  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;

  const groups = [...head, ...Array<string>(Math.max(0, missing)).fill("0"), ...tail];
  if (groups.length !== 8 || !groups.every((group) => HEXTET.test(group))) return null;

  return `v6:${groups
    .slice(0, 4)
    .map((group) => group.padStart(4, "0"))
    .join(":")}`;
}

export function normalizeClientAddress(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 64) return null;

  return candidate.includes(":")
    ? normalizeIpv6Prefix(candidate)
    : normalizeIpv4(candidate);
}

export function getRequestClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];

  return (
    normalizeClientAddress(forwarded) ??
    normalizeClientAddress(request.headers.get("x-real-ip"))
  );
}

// Null when the address is unknown or there is no secret to hash it with. The
// caller then falls back to the per-visitor limit alone.
export function getNetworkIdentity(
  request: Request,
  secret: string | null | undefined,
) {
  if (!secret) return null;

  const address = getRequestClientAddress(request);
  if (!address) return null;

  const digest = createHmac("sha256", secret).update(address).digest("hex");

  return `${NETWORK_ID_PREFIX}${digest.slice(0, 40)}`;
}

export function getNetworkIdentitySecret() {
  return (
    process.env.USAGE_IP_HASH_SECRET || process.env.SUPABASE_SECRET_KEY || null
  );
}
