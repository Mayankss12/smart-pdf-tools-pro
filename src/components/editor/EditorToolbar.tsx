"use client";

import {
  Copy,
  Download,
  FileImage,
  Highlighter,
  Image as ImageIcon,
  Layers,
  MousePointer2,
  Move,
  PenLine,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActiveTool } from "@/lib/editor/types";

type EditorToolbarProps = {
  activeTool: ActiveTool;
  hasSelectedLayer: boolean;
  onSelectTool: (tool: ActiveTool) => void;
  onImageClick: () => void;
  onSignatureClick: () => void;
  onSignatureImageClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearPage: () => void;
  onReset: () => void;
  onExport: () => void;
};

type CommandTone =
  | "neutral"
  | "indigo"
  | "sky"
  | "amber"
  | "violet"
  | "red"
  | "emerald";

type ToolCommand = {
  id: string;
  label: string;
  helper: string;
  icon: LucideIcon | "text-symbol";
  tone: CommandTone;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
};

type CommandSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  commands: ToolCommand[];
};

function toneStyles(tone: CommandTone, active: boolean, disabled: boolean) {
  if (disabled) {
    return {
      shell:
        "border-slate-200 bg-slate-100 text-slate-400 shadow-none cursor-not-allowed",
      icon: "border-slate-200 bg-white/70 text-slate-300",
      badge: "border-slate-200 bg-white/70 text-slate-400",
    };
  }

  if (active) {
    switch (tone) {
      case "sky":
        return {
          shell:
            "border-sky-300 bg-sky-600 text-white shadow-[0_18px_40px_rgba(2,132,199,0.25)]",
          icon: "border-white/20 bg-white/18 text-white",
          badge: "border-white/20 bg-white/15 text-white",
        };
      case "amber":
        return {
          shell:
            "border-amber-300 bg-amber-400 text-slate-950 shadow-[0_18px_40px_rgba(245,158,11,0.26)]",
          icon: "border-amber-200 bg-white/75 text-slate-950",
          badge: "border-amber-200 bg-white/70 text-slate-900",
        };
      case "violet":
        return {
          shell:
            "border-violet-300 bg-violet-600 text-white shadow-[0_18px_40px_rgba(124,58,237,0.25)]",
          icon: "border-white/20 bg-white/18 text-white",
          badge: "border-white/20 bg-white/15 text-white",
        };
      case "red":
        return {
          shell:
            "border-rose-300 bg-rose-600 text-white shadow-[0_18px_40px_rgba(225,29,72,0.22)]",
          icon: "border-white/20 bg-white/18 text-white",
          badge: "border-white/20 bg-white/15 text-white",
        };
      case "emerald":
        return {
          shell:
            "border-emerald-300 bg-emerald-600 text-white shadow-[0_18px_40px_rgba(5,150,105,0.22)]",
          icon: "border-white/20 bg-white/18 text-white",
          badge: "border-white/20 bg-white/15 text-white",
        };
      case "neutral":
      case "indigo":
      default:
        return {
          shell:
            "border-indigo-300 bg-indigo-600 text-white shadow-[0_18px_40px_rgba(79,70,229,0.25)]",
          icon: "border-white/20 bg-white/18 text-white",
          badge: "border-white/20 bg-white/15 text-white",
        };
    }
  }

  switch (tone) {
    case "sky":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800",
        icon: "border-sky-100 bg-sky-50 text-sky-700",
        badge: "border-sky-100 bg-sky-50 text-sky-700",
      };
    case "amber":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900",
        icon: "border-amber-100 bg-amber-50 text-amber-700",
        badge: "border-amber-100 bg-amber-50 text-amber-700",
      };
    case "violet":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800",
        icon: "border-violet-100 bg-violet-50 text-violet-700",
        badge: "border-violet-100 bg-violet-50 text-violet-700",
      };
    case "red":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
        icon: "border-rose-100 bg-rose-50 text-rose-700",
        badge: "border-rose-100 bg-rose-50 text-rose-700",
      };
    case "emerald":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
        icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
        badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
      };
    case "neutral":
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
        icon: "border-slate-200 bg-slate-50 text-slate-700",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
    case "indigo":
    default:
      return {
        shell:
          "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800",
        icon: "border-indigo-100 bg-indigo-50 text-indigo-700",
        badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
      };
  }
}

function CommandButton({ command }: { command: ToolCommand }) {
  const active = Boolean(command.active);
  const disabled = Boolean(command.disabled);
  const styles = toneStyles(command.tone, active, disabled);
  const Icon = command.icon === "text-symbol" ? null : command.icon;

  return (
    <button
      type="button"
      onClick={command.onClick}
      disabled={disabled}
      aria-pressed={active}
      title={`${command.label} — ${command.helper}`}
      className={[
        "group relative flex min-h-[84px] min-w-[148px] flex-col justify-between rounded-[1.35rem] border p-3 text-left transition duration-200",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        disabled ? "" : "hover:-translate-y-0.5",
        styles.shell,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition duration-200",
            styles.icon,
          ].join(" ")}
        >
          {Icon ? (
            <Icon size={18} />
          ) : (
            <span className="text-base font-black leading-none">T</span>
          )}
        </div>

        {command.shortcut ? (
          <span
            className={[
              "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
              styles.badge,
            ].join(" ")}
          >
            {command.shortcut}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="text-sm font-bold tracking-[-0.02em]">
          {command.label}
        </div>
        <p
          className={[
            "mt-1 line-clamp-2 text-[11px] font-medium leading-4",
            active
              ? command.tone === "amber"
                ? "text-slate-800/80"
                : "text-white/80"
              : disabled
                ? "text-slate-400"
                : "text-slate-500",
          ].join(" ")}
        >
          {command.helper}
        </p>
      </div>
    </button>
  );
}

function CommandSectionCard({ section }: { section: CommandSection }) {
  return (
    <section className="min-w-max rounded-[1.8rem] border border-slate-200 bg-slate-50/75 p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4 px-1">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
            {section.eyebrow}
          </div>
          <h3 className="mt-1 text-sm font-bold tracking-[-0.02em] text-slate-950">
            {section.title}
          </h3>
          <p className="mt-1 max-w-[18rem] text-xs font-medium leading-5 text-slate-500">
            {section.description}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {section.commands.map((command) => (
          <CommandButton key={command.id} command={command} />
        ))}
      </div>
    </section>
  );
}

function ExportCommand({
  onExport,
}: {
  onExport: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="group flex min-h-[108px] min-w-[196px] flex-col justify-between rounded-[1.8rem] border border-emerald-300 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-4 text-left text-white shadow-[0_24px_70px_rgba(5,150,105,0.25)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(5,150,105,0.34)] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white">
          <Download size={19} />
        </div>

        <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          Output
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-base font-bold tracking-[-0.03em]">
          Export PDF
          <Sparkles
            size={15}
            className="transition duration-200 group-hover:rotate-12"
          />
        </div>
        <p className="mt-1 text-xs font-medium leading-5 text-emerald-50/90">
          Download the current edited document with all visual changes applied.
        </p>
      </div>
    </button>
  );
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    activeTool,
    hasSelectedLayer,
    onSelectTool,
    onImageClick,
    onSignatureClick,
    onSignatureImageClick,
    onDelete,
    onDuplicate,
    onClearPage,
    onReset,
    onExport,
  } = props;

  const sections: CommandSection[] = [
    {
      id: "navigate",
      eyebrow: "Workspace Mode",
      title: "Select and control",
      description:
        "Choose whether you want to select text, move editor objects, or visually replace PDF text.",
      commands: [
        {
          id: "select",
          label: "Select Text",
          helper: "Copy or inspect real selectable PDF text.",
          icon: MousePointer2,
          tone: "neutral",
          active: activeTool === "select",
          shortcut: "S",
          onClick: () => onSelectTool("select"),
        },
        {
          id: "object",
          label: "Edit Object",
          helper: "Move, resize, duplicate, and delete visual layers.",
          icon: Move,
          tone: "sky",
          active: activeTool === "object",
          shortcut: "V",
          onClick: () => onSelectTool("object"),
        },
        {
          id: "edit",
          label: "Replace Text",
          helper: "Create an editable visual replacement over PDF text.",
          icon: Type,
          tone: "indigo",
          active: activeTool === "edit",
          shortcut: "E",
          onClick: () => onSelectTool("edit"),
        },
      ],
    },
    {
      id: "insert",
      eyebrow: "Create",
      title: "Add content",
      description:
        "Insert new text, highlights, images, signatures, and approval marks into the active page.",
      commands: [
        {
          id: "text",
          label: "Text Box",
          helper: "Drag on the page and type into a new overlay.",
          icon: "text-symbol",
          tone: "indigo",
          active: activeTool === "text",
          shortcut: "T",
          onClick: () => onSelectTool("text"),
        },
        {
          id: "highlight",
          label: "Highlight",
          helper: "Mark important content with a visual marker.",
          icon: Highlighter,
          tone: "amber",
          active: activeTool === "highlight",
          shortcut: "H",
          onClick: () => onSelectTool("highlight"),
        },
        {
          id: "image",
          label: "Image",
          helper: "Place a logo, stamp, or picture layer.",
          icon: ImageIcon,
          tone: "sky",
          onClick: onImageClick,
        },
      ],
    },
    {
      id: "signature",
      eyebrow: "Approval",
      title: "Sign and authorize",
      description:
        "Create signatures as editable text or upload a clean signature image.",
      commands: [
        {
          id: "typed-signature",
          label: "Typed Sign",
          helper: "Add a signature-style text object.",
          icon: PenLine,
          tone: "violet",
          onClick: onSignatureClick,
        },
        {
          id: "signature-image",
          label: "Sign Image",
          helper: "Upload a PNG, JPG, or WebP signature image.",
          icon: FileImage,
          tone: "violet",
          onClick: onSignatureImageClick,
        },
      ],
    },
    {
      id: "manage",
      eyebrow: "Object Actions",
      title: "Manage current work",
      description:
        "These controls act on the selected object or clear editor overlays from the workspace.",
      commands: [
        {
          id: "duplicate",
          label: "Duplicate",
          helper: "Clone the currently selected editor object.",
          icon: Copy,
          tone: "neutral",
          disabled: !hasSelectedLayer,
          onClick: onDuplicate,
        },
        {
          id: "delete",
          label: "Delete",
          helper: "Remove the selected editor object.",
          icon: Trash2,
          tone: "red",
          disabled: !hasSelectedLayer,
          onClick: onDelete,
        },
        {
          id: "clear-page",
          label: "Clear Page",
          helper: "Remove editor overlays from this page only.",
          icon: Layers,
          tone: "neutral",
          onClick: onClearPage,
        },
        {
          id: "reset",
          label: "Reset All",
          helper: "Clear every overlay created in this editor session.",
          icon: RotateCcw,
          tone: "neutral",
          onClick: onReset,
        },
      ],
    },
  ];

  return (
    <div className="relative">
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-[1.8rem] border border-slate-200 bg-white px-4 py-4 shadow-sm lg:flex-row lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">
            <Sparkles size={13} />
            Editor Command Dock
          </div>

          <h2 className="mt-3 text-lg font-black tracking-[-0.04em] text-slate-950 sm:text-xl">
            Choose a tool. The workspace adapts around it.
          </h2>

          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            Fresh PDFMantra editor controls — grouped for clarity, touch access,
            and future advanced workspace logic.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Current tool
          </div>
          <div className="mt-1 font-black tracking-[-0.02em] text-slate-950">
            {activeTool === "none"
              ? "No tool selected"
              : activeTool === "object"
                ? "Edit Object"
                : activeTool === "highlight"
                  ? "Highlight"
                  : activeTool === "select"
                    ? "Select Text"
                    : activeTool === "text"
                      ? "Text Box"
                      : "Replace Text"}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {sections.map((section) => (
            <CommandSectionCard key={section.id} section={section} />
          ))}

          <ExportCommand onExport={onExport} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
        <span className="leading-5">
          Swipe horizontally on smaller screens to access the full command dock.
        </span>

        <span className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
          Mobile-ready toolbar foundation
        </span>
      </div>
    </div>
  );
}
