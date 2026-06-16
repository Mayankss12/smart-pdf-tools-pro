"use client";

import { Bold, Italic, Minus, Plus, Underline } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import type {
  EditorObject,
  EditorObjectBox,
  EditorObjectData,
  EditorTextRun,
  EditorTextStyle,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type TextToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

type InlineCommand = "bold" | "italic" | "underline";

const TEXT_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];

function createRunId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampFontSize(value: number) {
  return Math.min(72, Math.max(8, value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeColor(value: string | null | undefined) {
  if (!value) return undefined;

  if (value.startsWith("#")) {
    return value.toLowerCase();
  }

  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

  if (!rgbMatch) return undefined;

  const [, red, green, blue] = rgbMatch;

  return `#${[red, green, blue]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function normalizeRun(run: EditorTextRun, fallback: Required<EditorTextStyle>): EditorTextRun {
  return {
    id: run.id || createRunId(),
    text: run.text,
    fontWeight: run.fontWeight ?? fallback.fontWeight,
    fontStyle: run.fontStyle ?? fallback.fontStyle,
    textDecoration: run.textDecoration ?? fallback.textDecoration,
    color: run.color ?? fallback.color,
  };
}

function sameStyle(left: EditorTextRun, right: EditorTextRun) {
  return (
    left.fontWeight === right.fontWeight &&
    left.fontStyle === right.fontStyle &&
    left.textDecoration === right.textDecoration &&
    left.color === right.color
  );
}

function mergeRuns(runs: readonly EditorTextRun[]) {
  const merged: EditorTextRun[] = [];

  runs.forEach((run) => {
    if (!run.text) return;

    const previous = merged.at(-1);

    if (previous && sameStyle(previous, run)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + run.text };
      return;
    }

    merged.push({ ...run, id: run.id || createRunId() });
  });

  return merged;
}

function getFallbackStyle(object: EditorObject): Required<EditorTextStyle> {
  return {
    fontWeight: object.data.fontWeight ?? "normal",
    fontStyle: object.data.fontStyle ?? "normal",
    textDecoration: object.data.textDecoration ?? "none",
    color: object.data.color ?? "#111827",
  };
}

function getRunsFromObject(object: EditorObject) {
  const fallback = getFallbackStyle(object);

  if (object.data.textRuns && object.data.textRuns.length > 0) {
    return mergeRuns(object.data.textRuns.map((run) => normalizeRun(run, fallback)));
  }

  return [{ id: createRunId(), text: object.data.text ?? "", ...fallback }];
}

function runToStyle(run: EditorTextRun) {
  return [
    `font-weight:${run.fontWeight ?? "normal"}`,
    `font-style:${run.fontStyle ?? "normal"}`,
    `text-decoration:${run.textDecoration ?? "none"}`,
    `color:${run.color ?? "#111827"}`,
  ].join(";");
}

function runsToHtml(runs: readonly EditorTextRun[]) {
  if (runs.length === 0) return "";

  return runs
    .map((run) => {
      const safeText = escapeHtml(run.text).replaceAll("\n", "<br>");
      return `<span data-run-id="${escapeHtml(run.id)}" style="${runToStyle(run)}">${safeText}</span>`;
    })
    .join("");
}

function readDomRuns(root: HTMLElement, fallback: Required<EditorTextStyle>) {
  const runs: EditorTextRun[] = [];

  function pushText(text: string, style: Required<EditorTextStyle>) {
    if (!text) return;
    runs.push({ id: createRunId(), text, ...style });
  }

  function walk(node: Node, inheritedStyle: Required<EditorTextStyle>) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "", inheritedStyle);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "br") {
      pushText("\n", inheritedStyle);
      return;
    }

    const nextStyle: Required<EditorTextStyle> = { ...inheritedStyle };
    const computedColor = normalizeColor(element.style.color);

    if (tag === "b" || tag === "strong" || element.style.fontWeight === "bold") {
      nextStyle.fontWeight = "bold";
    }

    if (Number.parseInt(element.style.fontWeight || "0", 10) >= 600) {
      nextStyle.fontWeight = "bold";
    }

    if (tag === "i" || tag === "em" || element.style.fontStyle === "italic") {
      nextStyle.fontStyle = "italic";
    }

    if (
      tag === "u" ||
      element.style.textDecoration.includes("underline") ||
      element.style.textDecorationLine.includes("underline")
    ) {
      nextStyle.textDecoration = "underline";
    }

    if (computedColor) {
      nextStyle.color = computedColor;
    }

    element.childNodes.forEach((child) => walk(child, nextStyle));

    if (tag === "div" || tag === "p") {
      pushText("\n", nextStyle);
    }
  }

  root.childNodes.forEach((child) => walk(child, fallback));

  return mergeRuns(runs);
}

const COMMAND_TO_STYLE: Record
  InlineCommand,
  { key: keyof EditorTextStyle; on: string; off: string }
> = {
  bold: { key: "fontWeight", on: "bold", off: "normal" },
  italic: { key: "fontStyle", on: "italic", off: "normal" },
  underline: { key: "textDecoration", on: "underline", off: "none" },
};

export function TextTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: TextToolProps) {
  const editableRef = useRef<HTMLDivElement | null>(null);
  const fallbackStyle = getFallbackStyle(object);
  const fontSize = Number(object.data.fontSize ?? 16);

  const hasInitialText = Boolean(object.data.text && object.data.text.trim().length);
  const [editing, setEditing] = useState(!hasInitialText);
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  function refreshToolbarState() {
    if (!editableRef.current) return;

    setToolbarState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  function syncFromDom() {
    const editable = editableRef.current;
    if (!editable) return;

    const runs = readDomRuns(editable, fallbackStyle);
    const text = runs.map((run) => run.text).join("");

    onUpdateData(object.id, { text, textRuns: runs });
  }

  // Keep the rendered HTML in sync while NOT editing (after undo/redo or
  // whole-box style toggles) without disturbing an active caret.
  useEffect(() => {
    const editable = editableRef.current;
    if (!editable || editing) return;

    editable.innerHTML = runsToHtml(getRunsFromObject(object));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object, editing]);

  // Focus + caret-to-end when entering edit mode.
  useEffect(() => {
    if (!selected || !editing) return;

    const frame = window.requestAnimationFrame(() => {
      const editable = editableRef.current;
      if (!editable) return;

      if (!editable.innerHTML) {
        editable.innerHTML = runsToHtml(getRunsFromObject(object));
      }

      editable.focus();

      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      refreshToolbarState();
    });

    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing]);

  // Live B/I/U button state while editing.
  useEffect(() => {
    if (!selected || !editing) return;

    document.addEventListener("selectionchange", refreshToolbarState);
    return () => document.removeEventListener("selectionchange", refreshToolbarState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing]);

  function ensureSelectionInEditable() {
    const editable = editableRef.current;
    if (!editable) return;

    editable.focus();

    const selection = window.getSelection();
    const usable =
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      editable.contains(selection.anchorNode) &&
      editable.contains(selection.focusNode);

    if (!usable) {
      const range = document.createRange();
      range.selectNodeContents(editable);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  // Toggle a style across the whole box via the data model (used when the box
  // is selected but not in edit mode).
  function toggleWholeBoxStyle(command: InlineCommand) {
    const mapping = COMMAND_TO_STYLE[command];
    const runs = getRunsFromObject(object);
    const allOn = runs.length > 0 && runs.every((run) => (run[mapping.key] ?? mapping.off) === mapping.on);
    const nextValue = allOn ? mapping.off : mapping.on;

    const nextRuns = runs.map((run) => ({ ...run, [mapping.key]: nextValue }));

    onUpdateData(object.id, {
      text: nextRuns.map((run) => run.text).join(""),
      textRuns: nextRuns,
      [mapping.key]: nextValue,
    });
  }

  function applyInlineCommand(event: MouseEvent<HTMLButtonElement>, command: InlineCommand) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(object.id);

    if (editing && editableRef.current) {
      // Selection-aware: applies to selection, or whole box if caret is collapsed.
      ensureSelectionInEditable();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false);
      syncFromDom();
      refreshToolbarState();
      return;
    }

    toggleWholeBoxStyle(command);
  }

  function applyColor(event: MouseEvent<HTMLButtonElement>, color: string) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(object.id);

    if (editing && editableRef.current) {
      ensureSelectionInEditable();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
      syncFromDom();
      refreshToolbarState();
      return;
    }

    const nextRuns = getRunsFromObject(object).map((run) => ({ ...run, color }));

    onUpdateData(object.id, {
      text: nextRuns.map((run) => run.text).join(""),
      textRuns: nextRuns,
      color,
    });
  }

  function changeFontSize(event: MouseEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    onUpdateData(object.id, { fontSize: clampFontSize(fontSize + delta) });
  }

  function insertPlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncFromDom();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      editableRef.current?.blur();
    }
  }

  const toolbarContent = (
    <>
      {(["bold", "italic", "underline"] as const).map((command) => {
        const Icon = command === "bold" ? Bold : command === "italic" ? Italic : Underline;
        const active = toolbarState[command];

        return (
          <button
            key={command}
            type="button"
            onMouseDown={(event) => applyInlineCommand(event, command)}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition duration-200",
              active ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
            title={`${command[0].toUpperCase()}${command.slice(1)} text`}
            aria-label={`${command} text`}
          >
            <Icon size={15} />
          </button>
        );
      })}

      <span className="h-5 w-px bg-slate-200" />

      <button
        type="button"
        onMouseDown={(event) => changeFontSize(event, -1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-8 text-center text-xs font-black text-slate-600">{fontSize}</span>

      <button
        type="button"
        onMouseDown={(event) => changeFontSize(event, 1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Increase font size"
        aria-label="Increase font size"
      >
        <Plus size={14} />
      </button>

      <span className="h-5 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((textColor) => (
          <button
            key={textColor}
            type="button"
            onMouseDown={(event) => applyColor(event, textColor)}
            className="h-6 w-6 rounded-full border-2 border-white transition duration-200 hover:ring-2 hover:ring-slate-200"
            style={{ backgroundColor: textColor }}
            title={`Text color ${textColor}`}
            aria-label={`Set text color ${textColor}`}
          />
        ))}
      </div>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={72}
      minHeight={28}
      toolbarLabel="Text"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <div
        ref={editableRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onFocus={() => {
          onSelect(object.id);
          setEditing(true);
          refreshToolbarState();
        }}
        onBlur={() => {
          setEditing(false);
          syncFromDom();
        }}
        onInput={syncFromDom}
        onPaste={insertPlainText}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          // Editing: keep the caret here. Not editing: let it bubble so the
          // shared frame can start a full-body drag.
          if (editing) {
            event.stopPropagation();
            onSelect(object.id);
          }
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onSelect(object.id);
          setEditing(true);
        }}
        className={[
          "block h-full w-full overflow-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-1 py-0.5 outline-none",
          editing ? "cursor-text select-text" : "cursor-move select-none",
        ].join(" ")}
        style={{ fontSize: fontSize * pageScale, lineHeight: 1.3 }}
        spellCheck={false}
        aria-label="Edit PDF text"
      />
    </EditorObjectFrame>
  );
}
