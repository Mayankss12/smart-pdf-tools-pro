"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  updatePersonalDetailsAction,
  type AccountActionResult,
} from "@/app/actions/account";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

export function PersonalDetailsForm({
  fullName,
  email,
  phone,
}: {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}) {
  const [state, action, pending] = useActionState<
    AccountActionResult | null,
    FormData
  >(updatePersonalDetailsAction, null);

  useEffect(() => {
    if (state?.success === false) {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")
          ?.focus();
      });
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          name="fullName"
          label="Full name"
          type="text"
          defaultValue={fullName}
          autoComplete="name"
          required
          error={
            state?.success === false && state.field === "fullName"
              ? state.error
              : undefined
          }
        />
        <AuthInput
          name="phone"
          label="Phone number (optional)"
          type="tel"
          defaultValue={phone}
          autoComplete="tel"
          error={
            state?.success === false && state.field === "phone"
              ? state.error
              : undefined
          }
        />
      </div>

      <AuthInput
        name="email"
        label="Email address"
        type="email"
        defaultValue={email}
        autoComplete="email"
        readOnly
        disabled
      />
      <p className="-mt-3 text-xs font-medium text-slate-500">
        Your sign-in email cannot be changed from this page.
      </p>

      {state?.success ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <CheckCircle2 size={17} />
          {state.message}
        </div>
      ) : null}
      {state?.success === false && !state.field ? (
        <div
          role="alert"
          tabIndex={-1}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      <div className="max-w-[220px]">
        <AuthButton
          isPending={pending}
          label="Save personal details"
          pendingLabel="Saving details"
        />
      </div>
    </form>
  );
}
