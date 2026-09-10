import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const paths = {
  authActions: "../src/app/actions/auth.ts",
  accountActions: "../src/app/actions/account.ts",
  callback: "../src/app/auth/callback/route.ts",
  resetPage: "../src/app/reset-password/page.tsx",
  proxy: "../src/proxy.ts",
  session: "../src/app/api/auth/session/route.ts",
  logoutRoute: "../src/app/logout/route.ts",
  recovery: "../src/lib/auth/password-recovery.ts",
  accountPage: "../src/app/account/page.tsx",
  personalForm: "../src/components/account/PersonalDetailsForm.tsx",
  headerAuth: "../src/components/auth/HeaderAuthLinks.tsx",
  profileMigration: "../supabase/migrations/0010_profile_update_permissions.sql",
  formCreator: "../src/components/PdfFormCreatorClient.tsx",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [
      key,
      await readFile(new URL(path, import.meta.url), "utf8"),
    ]),
  ),
);

assert.match(sources.recovery, /http|PASSWORD_RECOVERY_COOKIE/);
assert.match(sources.callback, /flow === "password-recovery"/);
assert.match(sources.callback, /PASSWORD_RECOVERY_COOKIE/);
assert.match(sources.callback, /httpOnly: true/);
assert.match(sources.callback, /sameSite: "lax"/);
assert.match(sources.authActions, /callbackUrl\.searchParams\.set\("flow", "password-recovery"\)/);
assert.match(sources.authActions, /callbackUrl\.searchParams\.set\("next", "\/reset-password"\)/);
assert.ok(
  sources.authActions.indexOf("isPasswordRecoveryMarker") <
    sources.authActions.indexOf("supabase.auth.updateUser"),
  "Password changes must require a recovery marker before updating auth",
);
assert.match(sources.authActions, /cookieStore\.delete\(PASSWORD_RECOVERY_COOKIE\)/);
assert.match(sources.resetPage, /recoveryMarked/);
assert.match(sources.resetPage, /supabase\.auth\.getUser/);
assert.match(sources.resetPage, /Reset link expired/);
assert.match(sources.proxy, /recoveryMode && !recoveryAllowed/);
assert.match(sources.proxy, /NextResponse\.redirect\(new URL\("\/reset-password"/);
assert.match(sources.proxy, /refreshSupabaseSession/);
await assert.rejects(
  access(new URL("../src/middleware.ts", import.meta.url)),
  "Legacy middleware must not coexist with the Next.js 16 proxy",
);
assert.match(sources.session, /isSignedIn: Boolean\(user\) && !recoveryMode/);
assert.match(sources.logoutRoute, /cookies\.delete\(PASSWORD_RECOVERY_COOKIE\)/);
assert.match(sources.callback, /getSafeAuthRedirectPath\(next\)/);

assert.match(sources.accountPage, /Personal details/);
assert.match(sources.accountPage, /Account settings/);
assert.match(sources.accountPage, /Change password/);
assert.match(sources.accountPage, /Document workspace/);
assert.match(sources.accountPage, /Subscription details/);
assert.match(sources.accountPage, /Privacy & security/);
assert.match(sources.personalForm, /updatePersonalDetailsAction/);
assert.match(sources.personalForm, /name="fullName"/);
assert.match(sources.personalForm, /name="phone"/);
assert.match(sources.personalForm, /name="email"/);
assert.match(sources.accountActions, /supabase\.auth\.getUser/);
assert.match(sources.accountActions, /\.from\("profiles"\)/);
assert.match(sources.accountActions, /supabase\.auth\.updateUser/);
assert.match(sources.headerAuth, /href: "\/account"/);
assert.match(sources.headerAuth, /href: "\/account\?tab=settings"/);

assert.match(sources.profileMigration, /revoke update on table public\.profiles from anon, authenticated/i);
assert.match(sources.profileMigration, /grant update \(full_name, avatar_url\)/i);
assert.doesNotMatch(
  sources.profileMigration,
  /grant update \([^)]*(tier|plan_key|daily_export_limit)/i,
);

assert.doesNotMatch(sources.formCreator, /bg-violet-500\/25|bg-violet-300\/15/);
assert.match(sources.formCreator, /border-violet-700 bg-transparent/);
assert.match(sources.formCreator, /border-violet-400 bg-transparent/);

console.log(
  JSON.stringify({
    passwordRecoveryIsolation: "passed",
    accountPersonalDetails: "passed",
    accountSettings: "passed",
    profilePrivilegeHardening: "passed",
    formCreatorPaperColor: "passed",
  }),
);
