"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string; field?: string };

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", {
      errorMap: () => ({
        message: "You must accept the Terms & Privacy Policy",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginStep1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const otpSchema = z.object({
  email: z.string().email(),
  token: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
  redirectTo: z.string().optional(),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function getFirstValidationError(error: z.ZodError): { message: string; field?: string } {
  const firstError = error.errors[0];

  return {
    message: firstError?.message ?? "Invalid form input.",
    field: typeof firstError?.path[0] === "string" ? firstError.path[0] : undefined,
  };
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

function getSafeRedirectPath(value: FormDataEntryValue | string | null | undefined): string {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/dashboard";
  }

  const blockedPrefixes = ["/login", "/signup", "/logout", "/auth"];

  if (blockedPrefixes.some((prefix) => rawValue === prefix || rawValue.startsWith(`${prefix}/`))) {
    return "/dashboard";
  }

  return rawValue;
}

async function getConfiguredServerClient(): Promise<Awaited<ReturnType<typeof createServerSupabaseClient>>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export async function signupAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  };

  const parsed = signupSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = getFirstValidationError(parsed.error);
    return { success: false, error: firstError.message, field: firstError.field };
  }

  const { fullName, email, phone, password } = parsed.data;

  try {
    const supabase = await getConfiguredServerClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    });

    if (error) {
      const lowerMessage = error.message.toLowerCase();

      if (lowerMessage.includes("already registered") || lowerMessage.includes("user already exists")) {
        return {
          success: false,
          error: "An account with this email already exists. Try logging in or use Forgot Password.",
          field: "email",
        };
      }

      return { success: false, error: "Unable to create account. Please try again." };
    }

    return { success: true, message: "Account created successfully. Please log in." };
  } catch {
    return { success: false, error: "Authentication service is not configured yet." };
  }
}

export async function loginVerifyPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginStep1Schema.safeParse(raw);

  if (!parsed.success) {
    const firstError = getFirstValidationError(parsed.error);
    return { success: false, error: firstError.message, field: firstError.field };
  }

  const { email, password } = parsed.data;

  try {
    const supabase = await getConfiguredServerClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        success: false,
        error: "Invalid email or password. If you signed up without a password, use Forgot Password.",
      };
    }

    await supabase.auth.signOut();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      if (otpError.message.toLowerCase().includes("rate limit")) {
        return { success: false, error: "Too many attempts. Please wait a few minutes before trying again." };
      }

      return { success: false, error: "Failed to send verification code. Please try again." };
    }

    return { success: true, message: email };
  } catch {
    return { success: false, error: "Authentication service is not configured yet." };
  }
}

export async function verifyOtpAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    token: formData.get("token"),
    redirectTo: formData.get("redirectTo") || undefined,
  };

  const parsed = otpSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = getFirstValidationError(parsed.error);
    return { success: false, error: firstError.message, field: firstError.field };
  }

  const { email, token, redirectTo } = parsed.data;
  const safeRedirectTo = getSafeRedirectPath(redirectTo);

  try {
    const supabase = await getConfiguredServerClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      const lowerMessage = error.message.toLowerCase();

      if (lowerMessage.includes("expired") || lowerMessage.includes("invalid")) {
        return {
          success: false,
          error: "Code is incorrect or has expired. Request a new code and try again.",
        };
      }

      return { success: false, error: "Verification failed. Please try again." };
    }

    revalidatePath(safeRedirectTo);
  } catch {
    return { success: false, error: "Authentication service is not configured yet." };
  }

  redirect(safeRedirectTo);
}

export async function resendOtpAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email")?.toString() ?? "";

  if (!z.string().email().safeParse(email).success) {
    return { success: false, error: "Invalid email address." };
  }

  try {
    const supabase = await getConfiguredServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        return { success: false, error: "Please wait before requesting another code." };
      }

      return { success: false, error: "Could not resend code. Please try again." };
    }

    return { success: true, message: "A new code has been sent to your email." };
  } catch {
    return { success: false, error: "Authentication service is not configured yet." };
  }
}

export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email")?.toString() ?? "";

  if (!z.string().email().safeParse(email).success) {
    return { success: false, error: "Please enter a valid email address.", field: "email" };
  }

  try {
    const supabase = await getConfiguredServerClient();

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?type=recovery`,
    });
  } catch {
    // Keep response generic so email existence is never exposed.
  }

  return {
    success: true,
    message: "If an account exists with this email, you will receive a password reset link shortly.",
  };
}

export async function resetPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = getFirstValidationError(parsed.error);
    return { success: false, error: firstError.message, field: first