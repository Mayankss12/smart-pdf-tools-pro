import type { LucideIcon } from "lucide-react";

export type ToolGlyphTone = "violet" | "blush" | "indigo" | "mint";

const toneStyles: Record<ToolGlyphTone, {
  shell: string;
  fold: string;
  icon: string;
}> = {
  violet: {
    shell: "border-violet-200 bg-violet-50/90",
    fold: "border-l-violet-200 border-t-white",
    icon: "text-violet-700",
  },
  blush: {
    shell: "border-rose-200 bg-rose-50/90",
    fold: "border-l-rose-200 border-t-white",
    icon: "text-rose-600",
  },
  indigo: {
    shell: "border-indigo-200 bg-indigo-50/90",
    fold: "border-l-indigo-200 border-t-white",
    icon: "text-indigo-700",
  },
  mint: {
    shell: "border-emerald-200 bg-emerald-50/90",
    fold: "border-l-emerald-200 border-t-white",
    icon: "text-emerald-700",
  },
};

export function ToolGlyph({
  icon: Icon,
  tone = "violet",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: ToolGlyphTone;
  size?: "sm" | "md" | "lg";
}) {
  const styles = toneStyles[tone];
  const shellSize = size === "sm" ? "h-10 w-10 rounded-2xl" : size === "lg" ? "h-14 w-14 rounded-[1.25rem]" : "h-12 w-12 rounded-[1.15rem]";
  const iconSize = size === "sm" ? 17 : size === "lg" ? 24 : 20;

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border ${shellSize} ${styles.shell}`}>
      <span className={`absolute right-0 top-0 h-0 w-0 border-l-[13px] border-t-[13px] border-l-transparent ${styles.fold}`} />
      <Icon size={iconSize} className={styles.icon} strokeWidth={2.2} />
    </span>
  );
}
