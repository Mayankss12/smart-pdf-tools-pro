import {
  EDITOR_COMMAND_REGISTRY,
  getEditorCommandById,
} from "./toolRegistry";

import type {
  EditorCommandId,
  EditorShortcutModifier,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type EditorShortcutMatch = {
  commandId: EditorCommandId;
  label: string;
  preventDefault: boolean;
};

export type EditorShortcutOptions = {
  allowInsideInputs?: boolean;
};

type EditableTarget =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLElement;

/* -------------------------------------------------------------------------- */
/* Editable target guard                                                       */
/* -------------------------------------------------------------------------- */

export function isEditableKeyboardTarget(
  target: EventTarget | null,
): target is EditableTarget {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  return target.isContentEditable;
}

/* -------------------------------------------------------------------------- */
/* Modifier matching                                                           */
/* -------------------------------------------------------------------------- */

function matchesModifier(
  event: KeyboardEvent,
  modifier?: EditorShortcutModifier,
) {
  const commandPressed = event.metaKey || event.ctrlKey;

  switch (modifier) {
    case "meta":
      return commandPressed && !event.shiftKey && !event.altKey;

    case "ctrl":
      return event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;

    case "shift":
      return event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;

    case "alt":
      return event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey;

    case "meta-shift":
      return commandPressed && event.shiftKey && !event.altKey;

    case "ctrl-shift":
      return event.ctrlKey && event.shiftKey && !event.metaKey && !event.altKey;

    case undefined:
      return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Key matching                                                                */
/* -------------------------------------------------------------------------- */

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function matchesShortcutKey(event: KeyboardEvent, expectedKey: string) {
  return normalizeKey(event.key) === normalizeKey(expectedKey);
}

/* -------------------------------------------------------------------------- */
/* Main resolver                                                               */
/* -------------------------------------------------------------------------- */

export function resolveEditorShortcut(
  event: KeyboardEvent,
  options: EditorShortcutOptions = {},
): EditorShortcutMatch | null {
  const { allowInsideInputs = false } = options;

  if (!allowInsideInputs && isEditableKeyboardTarget(event.target)) {
    return null;
  }

  for (const command of EDITOR_COMMAND_REGISTRY) {
    const shortcut = command.shortcut;

    if (!shortcut) {
      continue;
    }

    const keyMatches = matchesShortcutKey(event, shortcut.key);
    const modifierMatches = matchesModifier(event, shortcut.modifier);

    if (!keyMatches || !modifierMatches) {
      continue;
    }

    return {
      commandId: command.id,
      label: shortcut.label,
      preventDefault: Boolean(shortcut.preventDefault),
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                         */
/* -------------------------------------------------------------------------- */

export function getEditorShortcutLabel(
  commandId: EditorCommandId,
): string | null {
  return getEditorCommandById(commandId)?.shortcut?.label ?? null;
}

export function hasEditorShortcut(commandId: EditorCommandId) {
  return Boolean(getEditorCommandById(commandId)?.shortcut);
}

export function listEditorShortcutCommands() {
  return EDITOR_COMMAND_REGISTRY.filter((command) => command.shortcut);
}
