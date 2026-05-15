"use client";

import type { EditorCommandId } from "@/lib/editor/types";
import type {
  EditorCommandGroupDefinition,
  EditorCommandRegistryItem,
} from "@/lib/editor/toolRegistry";
import { ToolButton } from "./ToolButton";

type ToolGroupProps = {
  group: EditorCommandGroupDefinition;
  commands: EditorCommandRegistryItem[];
  activeCommandId?: EditorCommandId | null;
  compact?: boolean;
  showGroupLabel?: boolean;
  showCommandLabels?: boolean;
  getCommandDisabled?: (command: EditorCommandRegistryItem) => boolean;
  onCommandActivate?: (commandId: EditorCommandId) => void;
};

export function ToolGroup({
  group,
  commands,
  activeCommandId,
  compact = false,
  showGroupLabel = true,
  showCommandLabels = true,
  getCommandDisabled,
  onCommandActivate,
}: ToolGroupProps) {
  if (commands.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={group.label}
      className={[
        "flex min-w-max flex-col justify-center rounded-[1.35rem] border border-slate-200/80 bg-white/85 backdrop-blur-sm",
        compact ? "gap-1 px-2 py-2" : "gap-2 px-2.5 py-2.5",
      ].join(" ")}
    >
      {showGroupLabel ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {group.label}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {commands.map((command) => (
          <ToolButton
            key={command.id}
            command={command}
            active={activeCommandId === command.id}
            disabled={getCommandDisabled?.(command)}
            compact={compact}
            showLabel={showCommandLabels}
            onActivate={onCommandActivate}
          />
        ))}
      </div>
    </section>
  );
}
