"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type AuthInputIcon = "user" | "mail" | "phone" | "lock" | "key";

interface AuthInputProps {
  readonly name: string;
  readonly label: string;
  readonly type: "text" | "email" | "tel" | "password";
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly inputMode?: "text" | "email" | "tel" | "numeric";
  readonly icon?: AuthInputIcon;
  readonly revealable?: boolean;
}

const ICONS: Record<AuthInputIcon, LucideIcon> = {
  user: UserRound,
  mail: Mail,
  phone: Phone,
  lock: LockKeyhole,
  key: KeyRound,
};

function inferIcon(name: string, type: AuthInputProps["type"]): AuthInputIcon {
  if (type === "email") return "mail";
  if (type === "tel") return "phone";
  if (type === "password") return "lock";
  if (name.toLowerCase().includes("code")) return "key";
  return "user";
}

export function AuthInput({
  name,
  label,
  type,
  placeholder,
  autoComplete,
  required,
  optional,
  error,
  disabled,
  readOnly,
  inputMode,
  icon,
  revealable,
}: AuthInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const canReveal = type === "password" && revealable !== false;
  const Icon = ICONS[icon ?? inferIcon(name, type)];
  const errorId = `${name}-error`;

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-slate-700"
      >
        <span>{label}</span>
        {optional ? (
          <span className="font-medium normal-case tracking-normal text-slate-400">
            (optional)
          </span>
        ) : null}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
            error ? "text-red-500" : "text-slate-400"
          }`}
          size={18}
          strokeWidth={1.9}
        />
        <input
          id={name}
          name={name}
          type={canReveal && isVisible ? "text" : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          inputMode={inputMode}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-[50px] w-full rounded-[14px] border bg-white py-3 pl-11 text-sm font-medium text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-200/60 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 read-only:bg-slate-50 ${
            canReveal ? "pr-12" : "pr-4"
          } ${
            error
              ? "border-red-400 bg-red-50/20 ring-2 ring-red-100"
              : "border-slate-200 hover:border-violet-300"
          } motion-reduce:transition-none`}
        />
        {canReveal ? (
          <button
            type="button"
            onClick={() => setIsVisible((value) => !value)}
            disabled={disabled}
            aria-label={
              isVisible
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            aria-pressed={isVisible}
            className="absolute right-1.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {isVisible ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-semibold leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
