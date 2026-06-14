"use client";

import { Bold, Italic, Minus, Plus, Underline } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
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

const TEXT_COLORS = [
  "#111827",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#7c3aed",
];

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
      merged[merged.length - 1] = {
        ...previous,
        text: previous.text + run.text,
      };
      return;
    }

    merged.push({
      ...run,
      id: run.id || createRunId(),
    });
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

  return [
    {
      id: createRunId(),
      text: object.data.text ?? "",
      ...fallback,
    },
  ];
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

    runs.push({
      id: createRunId(),
      text,
      ...style,
    });
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

    const nextStyle: Required<EditorTextStyle> = {
      ...inheritedStyle,
    };

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
  const initializedObjectIdRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const fallbackStyle = getFallbackStyle(object);
  const fontSize = Number(object.data.fontSize ?? 16);

  useEffect(() => {
    const editable = editableRef.current;
    if (!editable) return;

    if (initializedObjectIdRef.current !== object.id) {
      editable.innerHTML = runsToHtml(getRunsFromObject(object));
      initializedObjectIdRef.current = object.id;
    }
  }, [object]);

  useEffect(() => {
    if (!selected || !editing) return;

    const frame = window.requestAnimationFrame(() => {
      editableRef.current?.focus();
      refreshToolbarState();
    });

    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editing]);

  useEffect(() => {
    if (!selected) return;

    document.addEventListener("selectionchange", refreshToolbarState);

    return () => {
      document.removeEventListener("selectionchange", refreshToolbarState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function syncFromDom() {
    const editable = editableRef.current;
    if (!editable) return;

    const runs = readDomRuns(editable, fallbackStyle);
    const text = runs.map((run) => run.text).join("");

    onUpdateData(object.id, {
      text,
      textRuns: runs,
    });
  }

  function refreshToolbarState() {
    if (!editableRef.current) return;

    setToolbarState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  function runCommand(
    event: MouseEvent<HTMLButtonElement>,
    command: "bold" | "italic" | "underline" | "foreColor",
    value?: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    onSelect(object.id);
    setEditing(true);

    document.execCommand(command, false, value);
    syncFromDom();
    refreshToolbarState();
  }

  function insertPlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncFromDom();
  }

  const toolbarContent = (
    <>
      <button
        type="button"
        onMouseDown={(event) => runCommand(event, "bold")}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          toolbarState.bold ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Bold selected text"
        aria-label="Bold selected text"
      >
        <Bold size={15} />
      </button>

      <button
        type="button"
        onMouseDown={(event) => runCommand(event, "italic")}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          toolbarState.italic ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Italic selected text"
        aria-label="Italic selected text"
      >
        <Italic size={15} />
      </button>

      <button
        type="button"
        onMouseDown={(event) => runCommand(event, "underline")}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          toolbarState.underline ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Underline selected text"
        aria-label="Underline selected text"
      >
        <Underline size={15} />
      </button>

      <span className="h-5 w-px bg-slate-200" />

      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontSize: clampFontSize(fontSize - 1),
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Decrease full text-box font size"
        aria-label="Decrease full text-box font size"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-8 text-center text-xs font-black text-slate-600">
        {fontSize}
      </span>

      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontSize: clampFontSize(fontSize + 1),
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Increase full text-box font size"
        aria-label="Increase full text-box font size"
      >
        <Plus size={14} />
      </button>

      <span className="h-5 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((textColor) => (
          <button
            key={textColor}
            type="button"
            onMouseDown={(event) => runCommand(event, "foreColor", textColor)}
            className="h-6 w-6 rounded-full border-2 border-white transition duration-200 hover:ring-2 hover:ring-slate-200"
            style={{ backgroundColor: textColor }}
            title={`Set selected text color ${textColor}`}
            aria-label={`Set selected text color ${textColor}`}
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
        contentEditable
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
        onInput={() => {
          syncFromDom();
        }}
        onPaste={insertPlainText}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(object.id);
          setEditing(true);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(object.id);
          setEditing(true);
          refreshToolbarState();
        }}
        className={[
          "block h-full w-full overflow-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-1 py-0.5 outline-none",
          selected ? "cursor-text" : "cursor-pointer",
        ].join(" ")}
        style={{
          fontSize: fontSize * pageScale,
          lineHeight: 1.3,
        }}
        spellCheck={false}
        aria-label="Edit PDF text"
      />
    </EditorObjectFrame>
  );
}