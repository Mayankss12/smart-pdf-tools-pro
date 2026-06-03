"use client";

import {
  ChevronDown,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type ToolbarAction = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
};

export type ToolToolbarShortcut = {
  key: string;
  description: string;
};

export type ToolToolbarProps = {
  primaryAction?: ToolbarAction;
  actions?: ToolbarAction[];
  moreOptions?: ToolbarAction[];
  shortcuts?: ToolToolbarShortcut[];
  description?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ToolbarButton({
  action,
  variant = "secondary",
}: {
  action: ToolbarAction;
  variant?: "primary" | "secondary" | "menu";
}) {
  const Icon = action.icon;
  const isDisabled = Boolean(action.disabled || action.loading);

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={action.onClick}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-full text-sm font-black transition duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100",
        isDisabled ? "cursor-not-allowed opacity-55" : "",
        variant === "primary"
          ? "bg-[var(--violet-600)] px-5 py-3 text-white shadow-[0_18px_35px_rgba(101,80,232,0.24)] hover:-translate-y-0.5 hover:bg-[var(--violet-700)]"
          : "",
        variant === "secondary"
          ? "border border-[var(--border-light)] bg-white px-4 py-2.5 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)]"
          : "",
        variant === "menu"
          ? action.danger
            ? "w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
            : "w-full px-3 py-2 text-left text-slate-700 hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)]"
          : "",
      )}
    >
      {action.loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} strokeWidth={2.4} />
      ) : null}
      <span>{action.label}</span>
    </button>
  );
}

export function ToolToolbar({
  primaryAction,
  actions = [],
  moreOptions = [],
  shortcuts = [],
  description,
}: ToolToolbarProps) {
  const hasShortcuts = shortcuts.length > 0;
  const hasMoreOptions = moreOptions.length > 0;

  return (
    <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-white/90 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2 px-1">
          {description ? (
            <p className="text-sm font-semibold leading-6 text-slate-500">
              {description}
            </p>
          ) : (
            <p className="text-sm font-semibold leading-6 text-slate-400">
              Choose an action to continue.
            </p>
          )}

          {hasShortcuts ? (
            <div className="group relative shrink-0">
              <button
                type="button"
                aria-label="Show keyboard shortcuts"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-slate-400 transition hover:border-[var(--violet-border)] hover:text-[var(--violet-700)]"
              >
                <HelpCircle size={16} />
              </button>

              <div className="pointer-events-none absolute left-0 top-10 z-30 w-72 translate-y-1 rounded-2xl border border-[var(--border-light)] bg-white p-3 opacity-0 shadow-[var(--shadow-card)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Shortcuts
                </p>

                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={`${shortcut.key}-${shortcut.description}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-semibold text-slate-500">
                        {shortcut.description}
                      </span>
                      <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}

          {hasMoreOptions ? (
            <details className="group relative">
              <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 [&::-webkit-details-marker]:hidden">
                <MoreHorizontal size={16} />
                More
                <ChevronDown
                  size={15}
                  className="transition group-open:rotate-180"
                />
              </summary>

              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                {moreOptions.map((action) => (
                  <ToolbarButton
                    key={action.label}
                    action={action}
                    variant="menu"
                  />
                ))}
              </div>
            </details>
          ) : null}

          {primaryAction ? (
            <ToolbarButton action={primaryAction} variant="primary" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
