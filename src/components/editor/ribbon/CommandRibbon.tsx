"use client";

import { useMemo } from "react";
import {
  EDITOR_COMMAND_GROUPS,
  getEditorCommandsByGroup,
  isEditorActionCommand,
  isEditorToolCommand,
} from "@/lib/editor/toolRegistry";
import type { EditorCommandId } from "@/lib/editor/types";
import { RibbonDivider } from "./RibbonDivider";
import { ToolGroup } from "./ToolGroup";

type CommandRibbonProps = {
  activeCommandId?: EditorCommandId | null;
  compact?: boolean;
  hasDocument?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onCommandActivate?: (commandId: EditorCommandId) => void;
};

export function CommandRibbon({
  activeCommandId,
  compact = false,
  hasDocument = true,
  canUndo = false,
  canRedo = false,
  onCommandActivate,
}: CommandRibbonProps) {
  const visibleGroups = useMemo(
    () =>
      EDITOR_COMMAND_GROUPS.map((group) => ({
        group,
        commands: getEditorCommandsByGroup(group.id),
      })).filter((entry) => entry.commands.length > 0),
    [],
  );

  function isCommandDisabled(commandId: EditorCommandId) {
    if (commandId === "undo") {
      return !canUndo;
    }

    if (commandId === "redo") {
      return !canRedo;
    }

    if (!hasDocument) {
      return true;
    }

    return false;
  }

  return (
    <nav
      aria-label="PDF editor command ribbon"
      className="rounded-[1.6rem] border border-slate-200/90 bg-white/95 p-2.5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-2.5">
          {visibleGroups.map((entry, index) => (
            <div key={entry.group.id} className="flex items-center gap-2.5">
              {index > 0 ? <RibbonDivider compact={compact} /> : null}

              <ToolGroup
                group={entry.group}
                commands={entry.commands}
                activeCommandId={activeCommandId}
                compact={compact}
                showGroupLabel={!compact}
                showCommandLabels
                getCommandDisabled={(command) => {
                  if (command.availability === "future-ready") {
                    return true;
                  }

                  if (isEditorActionCommand(command.id)) {
                    return isCommandDisabled(command.id);
                  }

                  if (isEditorToolCommand(command.id)) {
                    return !hasDocument;
                  }

                  return !hasDocument;
                }}
                onCommandActivate={onCommandActivate}
              />
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
