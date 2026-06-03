"use client";

import { CornerDownLeft } from "lucide-react";
import {
  useId,
  type KeyboardEvent,
} from "react";

export type PageRangeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  maxPages: number;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  error?: string | null;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageRangeInput({
  value,
  onChange,
  onApply,
  maxPages,
  disabled = false,
  placeholder = "e.g. 1-5, 10, 15-20",
  label = "Pages",
  error,
}: PageRangeInputProps) {
  const inputId = useId();
  const canApply = !disabled && value.trim().length > 0 && maxPages > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (canApply) {
      onApply();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-xs font-black uppercase tracking-[0.14em] text-slate-500"
        >
          {label}
        </label>

        <span className="text-xs font-semibold text-slate-400">
          Max {maxPages || 0} pages
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={classNames(
            "min-h-12 flex-1 rounded-2xl border bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition",
            "placeholder:text-slate-400 focus:border-[var(--violet-border)] focus:ring-4 focus:ring-violet-100",
            disabled ? "cursor-not-allowed opacity-60" : "",
            error
              ? "border-red-200 focus:border-red-300 focus:ring-red-100"
              : "border-[var(--border-light)]",
          )}
        />

        <button
          type="button"
          disabled={!canApply}
          onClick={onApply}
          className={classNames(
            "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition duration-200",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100",
            canApply
              ? "bg-[var(--violet-600)] text-white shadow-[0_18px_35px_rgba(101,80,232,0.22)] hover:-translate-y-0.5 hover:bg-[var(--violet-700)]"
              : "cursor-not-allowed bg-slate-100 text-slate-400",
          )}
        >
          Apply
          <CornerDownLeft size={16} />
        </button>
      </div>

      {error ? (
        <p className="px-1 text-xs font-semibold text-red-600">{error}</p>
      ) : (
        <p className="px-1 text-xs font-medium text-slate-400">
          Use commas and ranges, for example 1-5, 10, 15-20.
        </p>
      )}
    </div>
  );
}
