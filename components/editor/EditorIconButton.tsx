"use client";

import type { LucideIcon } from "lucide-react";

type EditorIconButtonProps = {
  label: string;
  description?: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "warning" | "danger" | "success";
  onClick: () => void;
};

const toneStyles = {
  default: {
    idle: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    active: "border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-200",
  },
  primary: {
    idle: "border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-200 hover:bg-indigo-100",
    active: "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100",
  },
  warning: {
    idle: "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100",
    active: "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-100",
  },
  danger: {
    idle: "border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:bg-red-100",
    active: "border-red-600 bg-red-600 text-white shadow-lg shadow-red-100",
  },
  success: {
    idle: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100",
    active: "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-100",
  },
};

export default function EditorIconButton({
  label,
  description,
  icon: Icon,
  active = false,
  disabled = false,
  tone = "default",
  onClick,
}: EditorIconButtonProps) {
  const styles = toneStyles[tone];

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black transition ${
          active ? styles.active : styles.idle
        } disabled:cursor-not-allowed disabled:opacity-45`}
      >
        <Icon size={20} strokeWidth={2.4} />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-xl shadow-slate-200 group-hover:block">
        <div className="text-sm font-black text-slate-950">{label}</div>
        {description ? (
          <div className="mt-0.5 max-w-[190px] text-[11px] font-semibold leading-4 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
