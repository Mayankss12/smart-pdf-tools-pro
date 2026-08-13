import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  EXPIRED_OTP_ERROR,
  INCORRECT_OTP_ERROR,
  getSafeAuthRedirectPath,
  isValidOtpToken,
  normalizeAuthEmail,
  normalizeOtpToken,
  verifyOtpSessionFlow,
} from "../src/lib/auth/otp-flow.ts";

class FakeOtpProvider {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.records = new Map();
  }

  issue(email, token, expiresAt) {
    this.records.set(normalizeAuthEmail(email), {
      token,
      expiresAt,
      consumed: false,
    });
  }

  async verify({ email, token }) {
    const normalizedEmail = normalizeAuthEmail(email);
    const record = this.records.get(normalizedEmail);

    if (!record) {
      return {
        session: null,
        user: null,
        error: { code: "invalid_otp", message: "Invalid OTP", status: 403 },
      };
    }

    if (record.consumed) {
      return {
        session: null,
        user: null,
        error: { code: "otp_expired", message: "OTP already consumed", status: 403 },
      };
    }

    if (record.expiresAt <= this.now()) {
      return {
        session: null,
        user: null,
        error: { code: "otp_expired", message: "OTP expired", status: 403 },
      };
    }

    if (record.token !== token) {
      return {
        session: null,
        user: null,
        error: { code: "invalid_otp", message: "Invalid OTP", status: 403 },
      };
    }

    record.consumed = true;

    return {
      session: { accessToken: "deterministic-session" },
      user: { id: "user-1", email: normalizedEmail },
      error: null,
    };
  }
}

class FakeAttemptGuard {
  constructor({ failStore = false, maxFailures = 5 } = {}) {
    this.failStore = failStore;
    this.maxFailures = maxFailures;
    this.failures = 0;
    this.cleared = false;
  }

  async hasActiveLock() {
    if (this.failStore) throw new Error("attempt store unavailable");
    return this.failures >= this.maxFailures;
  }

  async recordFailure() {
    if (this.failStore) throw new Error("attempt store unavailable");
    this.failures += 1;
    return this.failures >= this.maxFailures;
  }

  async clear() {
    if (this.failStore) throw new Error("attempt store unavailable");
    this.failures = 0;
    this.cleared = true;
  }
}

const now = Date.UTC(2026, 7, 13, 6, 0, 0);

assert.equal(normalizeOtpToken(" 072941 "), "072941");
assert.equal(normalizeOtpToken("0 7 2 9 4 1"), "072941");
assert.equal(isValidOtpToken("072941"), true);
assert.equal(isValidOtpToken("72941"), false);
assert.equal(normalizeAuthEmail("  User.Name@Example.COM "), "user.name@example.com");

{
  const provider = new FakeOtpProvider(() => now);
  const guard = new FakeAttemptGuard();
  provider.issue("user@example.com", "072941", now + 5 * 60_000);

  const result = await verifyOtpSessionFlow(
    { email: " USER@Example.com ", token: "072941" },
    { provider, attemptGuard: guard },
  );

  assert.equal(result.ok, true, "A valid leading-zero OTP must be accepted");
  assert.equal(result.email, "user@example.com");
  assert.deepEqual(result.session, { accessToken: "deterministic-session" });
  assert.equal(guard.cleared, true, "Successful verification must clear failed-attempt state");
}

{
  const provider = new FakeOtpProvider(() => now);
  provider.issue("user@example.com", "072941", now + 5 * 60_000);

  const result = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "172941" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "incorrect");
  assert.equal(result.error, INCORRECT_OTP_ERROR);
}

{
  const provider = new FakeOtpProvider(() => now);
  provider.issue("user@example.com", "072941", now - 1);

  const result = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "072941" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "expired");
  assert.equal(result.error, EXPIRED_OTP_ERROR);
}

{
  const provider = new FakeOtpProvider(() => now);
  provider.issue("user@example.com", "072941", now + 5 * 60_000);

  const first = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "072941" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );
  const reused = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "072941" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );

  assert.equal(first.ok, true);
  assert.equal(reused.ok, false, "A consumed OTP must not be reusable");
}

{
  const provider = new FakeOtpProvider(() => now);
  provider.issue("user@example.com", "111111", now + 5 * 60_000);
  provider.issue("user@example.com", "222222", now + 5 * 60_000);

  const oldCode = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "111111" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );
  const newCode = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "222222" },
    { provider, attemptGuard: new FakeAttemptGuard() },
  );

  assert.equal(oldCode.ok, false, "Resend must replace the previous OTP");
  assert.equal(newCode.ok, true, "Newest resend OTP must verify");
}

{
  const provider = new FakeOtpProvider(() => now);
  provider.issue("user@example.com", "072941", now + 5 * 60_000);

  const result = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "072941" },
    { provider, attemptGuard: new FakeAttemptGuard({ failStore: true }) },
  );

  assert.equal(
    result.ok,
    true,
    "An unavailable auxiliary attempt store must not reject a provider-valid OTP",
  );
}

{
  const provider = {
    async verify({ email }) {
      return {
        session: null,
        user: { id: "user-1", email },
        error: null,
      };
    },
  };

  const result = await verifyOtpSessionFlow(
    { email: "user@example.com", token: "072941" },
    { provider },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "session", "Success must require a real session contract");
}

assert.equal(getSafeAuthRedirectPath("/editor?file=1"), "/editor?file=1");
assert.equal(getSafeAuthRedirectPath("//evil.example"), "/dashboard");
assert.equal(getSafeAuthRedirectPath("/login"), "/dashboard");
assert.equal(getSafeAuthRedirectPath("/auth/callback"), "/dashboard");

const [routeSource, actionsSource, helperSource] = await Promise.all([
  readFile(new URL("../src/app/api/auth/verify-otp/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/actions/auth.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/auth/otp-flow.ts", import.meta.url), "utf8"),
]);
const productionAuthSource = `${routeSource}\n${actionsSource}\n${helperSource}`;

assert.doesNotMatch(
  productionAuthSource,
  /console\.(?:log|info|warn|error)\s*\([^)]*(?:otp|token|code)/i,
  "OTP values must never be logged",
);
assert.doesNotMatch(
  routeSource,
  /\.(?:insert|upsert)\s*\([^)]*(?:otp|token)/i,
  "The application must not persist plaintext OTP values",
);
assert.match(routeSource, /response\.cookies\.set/);
assert.match(routeSource, /verifyOtpSessionFlow/);
assert.match(routeSource, /type:\s*"email"/);
assert.match(actionsSource, /normalizeAuthEmail/);
assert.match(actionsSource, /shouldCreateUser:\s*false/);

console.log(
  JSON.stringify({
    leadingZeroOtp: "passed",
    validOtp: "passed",
    incorrectOtp: "passed",
    expiredOtp: "passed",
    consumedOtp: "passed",
    resendReplacement: "passed",
    normalizedEmail: "passed",
    plaintextOtpExposure: "passed",
    sessionRedirectContract: "passed",
    auxiliaryLimiterFallback: "passed",
  }),
);
