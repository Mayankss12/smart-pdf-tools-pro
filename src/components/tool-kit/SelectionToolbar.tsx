"use client";

export type SelectionToolbarAction = {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export type SelectionToolbarProps = {
  visible: boolean;
  selectedCount: number;
  selectedLabel?: string;
  actions: SelectionToolbarAction[];
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SelectionToolbar({
  visible,
  selectedCount,
  selectedLabel,
  actions,
}: SelectionToolbarProps) {
  if (!visible) return null;

  const label =
    selectedLabel ??
    `${selectedCount} ${selectedCount === 1 ? "page" : "pages"} selected`;

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="flex max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[1.75rem] border border-[var(--violet-border)] bg-white/95 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl transition duration-200 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-full bg-[var(--violet-50)] px-4 py-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--violet-600)] px-2 text-xs font-black text-white">
            {selectedCount}
          </span>

          <span className="whitespace-nowrap text-sm font-black tracking-[-0.02em] text-slate-800">
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={classNames(
                "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition duration-200",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100",
                action.disabled ? "cursor-not-allowed opacity-50" : "",
                action.danger
                  ? "border border-red-200 bg-red-50 text-red-600 hover:-translate-y-0.5 hover:bg-red-100"
                  : "border border-[var(--border-light)] bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)]",
              )}
            >
              {action.icon ? (
                <span aria-hidden="true" className="text-sm leading-none">
                  {action.icon}
                </span>
              ) : null}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
