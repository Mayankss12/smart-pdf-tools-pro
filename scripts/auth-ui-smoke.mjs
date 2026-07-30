import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePaths = {
  shell: "../src/components/auth/AuthPageShell.tsx",
  input: "../src/components/auth/AuthInput.tsx",
  button: "../src/components/auth/AuthButton.tsx",
  signupForm: "../src/components/auth/SignupForm.tsx",
  loginForm: "../src/components/auth/LoginForm.tsx",
  otpForm: "../src/components/auth/OtpVerifyForm.tsx",
  forgotForm: "../src/components/auth/ForgotPasswordForm.tsx",
  resetForm: "../src/components/auth/ResetPasswordForm.tsx",
  signupPage: "../src/app/signup/page.tsx",
  loginPage: "../src/app/login/page.tsx",
  otpPage: "../src/app/login/verify-otp/page.tsx",
  forgotPage: "../src/app/forgot-password/page.tsx",
  resetPage: "../src/app/reset-password/page.tsx",
  errorPage: "../src/app/auth/error/page.tsx",
  actions: "../src/app/actions/auth.ts",
  verifyRoute: "../src/app/api/auth/verify-otp/route.ts",
  serverClient: "../src/lib/supabase/server.ts",
};

const entries = await Promise.all(
  Object.entries(sourcePaths).map(async ([key, path]) => [
    key,
    await readFile(new URL(path, import.meta.url), "utf8"),
  ]),
);
const sources = Object.fromEntries(entries);
const authUiSource = Object.entries(sources)
  .filter(([key]) => !["actions", "verifyRoute", "serverClient"].includes(key))
  .map(([, source]) => source)
  .join("\n");

assert.doesNotMatch(authUiSource, /HomeEssentials/i);
assert.doesNotMatch(sources.shell, /TRUST_POINTS|lg:grid-cols|Secure workspace/i);
assert.doesNotMatch(
  sources.shell,
  /Secure access for your smart PDF workspace|Private document workspace/i,
);
assert.match(sources.shell, /max-w-\[440px\]/);
assert.match(sources.shell, /max-w-\[470px\]/);
assert.match(sources.shell, /rounded-\[26px\]/);
assert.match(sources.shell, /overflow-x-hidden/);
assert.match(sources.shell, /PDFMantra home/);
assert.match(sources.shell, /Back to site/);

assert.match(sources.signupPage, /title="Create your account"/);
assert.match(sources.signupPage, /subtitle="Start using PDFMantra for free\."/);
assert.match(sources.signupPage, /size="wide"/);
for (const name of [
  "fullName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "acceptTerms",
]) {
  assert.match(sources.signupForm, new RegExp(`name="${name}"`));
}
assert.match(sources.signupForm, /signupAction/);
assert.match(sources.signupForm, /Create account/);
assert.match(sources.signupForm, /\/terms/);
assert.match(sources.signupForm, /\/privacy/);
assert.doesNotMatch(sources.signupForm, /Create your PDFMantra account|ShieldCheck/);

assert.match(sources.loginPage, /title="Welcome back"/);
assert.match(
  sources.loginPage,
  /subtitle="Sign in to your account to continue\."/,
);
assert.match(sources.loginForm, /loginVerifyPasswordAction/);
assert.match(sources.loginForm, /name="email"/);
assert.match(sources.loginForm, /name="password"/);
assert.match(sources.loginForm, /\/forgot-password/);
assert.match(sources.loginForm, /Send verification code/);
assert.match(sources.loginForm, /\/login\/verify-otp\?/);

assert.match(sources.otpPage, /title="Verify your sign-in"/);
assert.match(sources.otpPage, /Enter the six-digit code to continue\./);
assert.match(
  sources.otpForm,
  /Verification code sent to your email/,
);
assert.match(sources.otpForm, /maskEmail/);
assert.match(sources.otpForm, /inputMode="numeric"/);
assert.match(sources.otpForm, /one-time-code/);
assert.match(sources.otpForm, /Verify & sign in/);
assert.match(sources.otpForm, /resendOtpAction/);
assert.match(sources.otpForm, /\/api\/auth\/verify-otp/);
assert.doesNotMatch(sources.otpForm, /5 minutes|five minutes/i);

assert.match(sources.forgotForm, /forgotPasswordAction/);
assert.match(sources.forgotForm, /Send reset link/);
assert.match(sources.resetForm, /resetPasswordAction/);
assert.match(sources.resetForm, /Set new password/);
assert.match(sources.errorPage, /\/login/);
assert.match(sources.errorPage, /\/forgot-password/);

assert.match(sources.input, /UserRound/);
assert.match(sources.input, /Mail/);
assert.match(sources.input, /Phone/);
assert.match(sources.input, /LockKeyhole/);
assert.match(sources.input, /KeyRound/);
assert.match(sources.input, /aria-invalid/);
assert.match(sources.input, /aria-describedby/);
assert.match(sources.input, /readOnly/);
assert.match(sources.input, /disabled/);
assert.match(sources.input, /Show \$\{label\.toLowerCase\(\)\}/);
assert.match(sources.button, /aria-busy/);
assert.match(sources.button, /motion-reduce/);
assert.match(authUiSource, /role="alert"/);
assert.match(authUiSource, /role="status"/);

for (const action of [
  "signupAction",
  "loginVerifyPasswordAction",
  "resendOtpAction",
  "forgotPasswordAction",
  "resetPasswordAction",
]) {
  assert.match(sources.actions, new RegExp(`export async function ${action}`));
}
assert.match(sources.actions, /signInWithPassword/);
assert.match(sources.actions, /shouldCreateUser:\s*false/);
assert.match(sources.actions, /getSafeRedirectPath/);
assert.match(sources.actions, /rawValue\.startsWith\("\/\/"\)/);
assert.match(sources.verifyRoute, /MAX_FAILED_ATTEMPTS = 5/);
assert.match(sources.verifyRoute, /isSameSiteStateChangingRequest/);
assert.match(sources.verifyRoute, /getSafeRedirectPath/);
assert.match(sources.verifyRoute, /Cache-Control": "no-store"/);
assert.ok(
  sources.verifyRoute.indexOf("if (!config || !attemptHashSecret)") <
    sources.verifyRoute.indexOf("createServerClient(config.url"),
  "OTP route must reject unconfigured auth before making a provider request",
);
assert.ok(
  sources.serverClient.indexOf("if (!config)") <
    sources.serverClient.indexOf("createServerClient(config.url"),
  "Server auth helper must return before creating a provider client when unconfigured",
);

console.log(
  JSON.stringify({
    authShell: "passed",
    authRoutes: 6,
    authActions: 5,
    otpSecurity: "passed",
    accessibility: "passed",
    responsiveSourceGuards: "passed",
  }),
);
