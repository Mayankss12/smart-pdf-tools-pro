"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { EditorCommandId } from "@/lib/editor/types";
import type { EditorCommandRegistryItem } from "@/lib/editor/toolRegistry";

type ToolButtonProps = {
  command: EditorCommandRegistryItem;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  onActivate?: (commandId: EditorCommandId) => void;
};

function buildTooltip(command: EditorCommandRegistryItem) {
  const shortcut = command.shortcut?.label;
  return shortcut ? `${command.tooltip} · ${shortcut}` : command.tooltip;
}

function getButtonTone(
  command: EditorCommandRegistryItem,
  active: boolean,
  disabled: boolean,
) {
  if (disabled) {
    return {
      shell:
        "cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400 shadow-none",
      icon: "bg-white/70 text-slate-300",
      meta: "text-slate-400",
      badge: "border-slate-200 bg-white/70 text-slate-400",
    };
  }

  if (command.emphasis === "success") {
    return active
      ? {
          shell:
            "border-emerald-300 bg-emerald-600 text-white shadow-[0_14px_28px_rgba(5,150,105,0.24)]",
          icon: "bg-white/16 text-white",
          meta: "text-emerald-50/90",
          badge: "border-white/20 bg-white/15 text-white",
        }
      : {
          shell:
            "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100/80",
          icon: "bg-white text-emerald-700",
          meta: "text-emerald-700/80",
          badge: "border-emerald-200 bg-white text-emerald-700",
        };
  }

  if (active) {
    return {
      shell:
        "border-indigo-300 bg-indigo-600 text-white shadow-[0_14px_28px_rgba(79,70,229,0.22)]",
      icon: "bg-white/16 text-white",
      meta: "text-indigo-50/90",
      badge: "border-white/20 bg-white/15 text-white",
    };
  }

  if (command.status === "coming-soon") {
    return {
      shell:
        "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-800",
      icon: "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-700",
      meta: "text-slate-500 group-hover:text-indigo-700/80",
      badge: "border-slate-200 bg-slate-50 text-slate-500",
    };
  }

  if (command.status === "beta") {
    return {
      shell:
        "border-amber-200 bg-white text-slate-800 hover:border-amber-300 hover:bg-amber-50/75 hover:text-amber-950",
      icon: "bg-amber-50 text-amber-700 group-hover:bg-white",
      meta: "text-slate-500 group-hover:text-amber-800/80",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    shell:
      "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/75 hover:text-indigo-800",
    icon: "bg-indigo-50 text-indigo-700 group-hover:bg-white",
    meta: "text-slate-500 group-hover:text-indigo-700/80",
    badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
  };
}

function getStatusLabel(command: EditorCommandRegistryItem) {
  if (command.status === "coming-soon") {
    return "Soon";
  }

  if (command.status === "beta") {
    return "Beta";
  }

  return null;
}

export function ToolButton({
  command,
  active = false,
  disabled,
  compact = false,
  showLabel = true,
  onActivate,
}: ToolButtonProps) {
  const Icon = command.icon;
  const futureOnly = command.availability === "future-ready";
  const isDisabled = disabled ?? futureOnly;
  const tone = getButtonTone(command, active, isDisabled);
  const statusLabel = getStatusLabel(command);
  const tooltip = buildTooltip(command);

  function activate() {
    if (isDisabled) {
      return;
    }

    onActivate?.(command.id);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    activate();
  }

  return (
    <button
      type="button"
      data-command-id={command.id}
      data-command-kind={command.kind}
      data-command-status={command.status}
      aria-label={tooltip}
      aria-pressed={command.kind === "tool" || command.kind === "menu" ? active : undefined}
      disabled={isDisabled}
      title={tooltip}
      onClick={activate}
      onKeyDown={handleKeyDown}
      className={[
        "group relative inline-flex min-h-11 items-center rounded-2xl border font-semibold transition duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        compact ? "gap-2 px-2.5 py-2" : "gap-2.5 px-3 py-2.5",
        !isDisabled ? "hover:-translate-y-0.5 hover:shadow-lg" : "",
        tone.shell,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-xl transition duration-200",
          compact ? "h-7 w-7" : "h-8 w-8",
          tone.icon,
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon size={compact ? 15 : 16} strokeWidth={2.2} />
      </span>

      {showLabel ? (
        <span className="flex min-w-0 flex-col items-start leading-none">
          <span className="truncate text-[13px] tracking-[-0.02em]">
            {compact ? command.shortLabel ?? command.label : command.label}
          </span>

          {!compact && command.shortcut?.label ? (
            <span className={["mt-1 text-[10px] font-bold uppercase tracking-[0.12em]", tone.meta].join(" ")}>
              {command.shortcut.label}
            </span>
          ) : null}
        </span>
      ) : null}

      {statusLabel ? (
        <span
          className={[
            "hidden rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] xl:inline-flex",
            tone.badge,
          ].join(" ")}
        >
          {statusLabel}
        </span>
      ) : null}
    </button>
  );
}
