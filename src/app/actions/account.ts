"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountActionResult =
  | { success: true; message: string }
  | { success: false; error: string; field?: "fullName" | "phone" };

const personalDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must be 100 characters or fewer."),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be 30 characters or fewer.")
    .refine(
      (value) => !value || /^[+()\-\s\d]{7,30}$/.test(value),
      "Enter a valid phone number.",
    ),
});

export async function updatePersonalDetailsAction(
  _previous: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  const parsed = personalDetailsSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      success: false,
      error: issue?.message ?? "Check your personal details and try again.",
      field: field === "phone" ? "phone" : "fullName",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: "Account service is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired. Sign in again." };
  }

  const fullName = parsed.data.fullName;
  const phone = parsed.data.phone || null;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: "Unable to save your personal details." };
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      full_name: fullName,
      phone,
    },
  });

  if (metadataError) {
    return {
      success: false,
      error: "Your name was saved, but the account contact details could not be refreshed. Try again.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { success: true, message: "Personal details updated." };
}
