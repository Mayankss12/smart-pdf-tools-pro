import type { LucideIcon } from "lucide-react";

export type ToolGlyphTone = "violet" | "blush" | "indigo" | "mint";

const toneStyles: Record<ToolGlyphTone, {
  shell: string;
  fold: string;
  icon: string;
}> = {
  violet: {
    shell: "border-[var(--violet-border)] bg-[var(--violet-50)]",
    fold: "border-l-[var(--violet-border)] border-t-[var(--cream-base)]",
    icon: "text-[var(--violet-600)]",
  },
  blush: {
    shell: "border-[var(--violet-border)] bg-[var(--cream-base)]",
    fold: "border-l-[var(--violet-border)] border-t-[var(--cream-secondary)]",
    icon: "text-[var(--violet-600)]",
  },
  indigo: {
    shell: "border-[var(--cream-border)] bg-[var(--cream-secondary)]",
    fold: "border-l-[var(--cream-border)] border-t-[var(--cream-base)]",
    icon: "text-[var(--violet-600)]",
  },
  mint: {
    shell: "border-[var(--violet-border)] bg-[var(--violet-100)]",
    fold: "border-l-[var(--violet-border)] border-t-[var(--cream-base)]",
    icon: "text-[var(--violet-600)]",
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
  const shellSize =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
        ? "h-14 w-14 rounded-2xl"
        : "h-12 w-12 rounded-xl";
  const iconSize = size === "sm" ? 17 : size === "lg" ? 24 : 20;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border shadow-[var(--shadow-soft)] ${shellSize} ${styles.shell}`}
    >
      <span
        className={`absolute right-0 top-0 h-0 w-0 border-l-[13px] border-t-[13px] border-l-transparent ${styles.fold}`}
      />
      <Icon size={iconSize} className={styles.icon} strokeWidth={2.1} />
    </span>
  );
}
