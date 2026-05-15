"use client";

import type { ReactNode } from "react";

type EditorIconButtonTone =
  | "default"
  | "indigo"
  | "amber"
  | "sky"
  | "violet"
  | "red"
  | "emerald";

type EditorIconButtonProps = {
  label: string;
  description?: string;
  active?: boolean;
  disabled?: boolean;
  tone?: EditorIconButtonTone;
  onClick: () => void;
  children: ReactNode;
};

const toneClasses: Record<
  EditorIconButtonTone,
  {
    idle: string;
    active: string;
  }
> = {
  default: {
    idle: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
    active: "border-slate-800 bg-slate-900 text-white shadow-slate-200",
  },
  indigo: {
    idle: "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    active: "border-indigo-500 bg-indigo-700 text-white shadow-indigo-100",
  },
  amber: {
    idle: "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100",
    active: "border-amber-400 bg-amber-400 text-slate-950 shadow-amber-100",
  },
  sky: {
    idle: "border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100",
    active: "border-sky-500 bg-sky-600 text-white shadow-sky-100",
  },
  violet: {
    idle: "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100",
    active: "border-violet-500 bg-violet-700 text-white shadow-violet-100",
  },
  red: {
    idle: "border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
    active: "border-red-500 bg-red-600 text-white shadow-red-100",
  },
  emerald: {
    idle: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    active: "border-emerald-500 bg-emerald-600 text-white shadow-emerald-100",
  },
};

export function EditorIconButton({
  label,
  description,
  active = false,
  disabled = false,
  tone = "default",
  onClick,
  children,
}: EditorIconButtonProps) {
  const selectedTone = toneClasses[tone];
  const visualClass = active ? selectedTone.active : selectedTone.idle;

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={description || label}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${visualClass}`}
      >
        {children}
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-bold leading-4 text-white shadow-xl group-hover:block">
        <div>{label}</div>
        {description ? (
          <div className="mt-1 text-[11px] font-semibold text-slate-300">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
