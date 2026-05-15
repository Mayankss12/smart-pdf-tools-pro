type RibbonDividerProps = {
  orientation?: "vertical" | "horizontal";
  decorative?: boolean;
  compact?: boolean;
  className?: string;
};

export function RibbonDivider({
  orientation = "vertical",
  decorative = true,
  compact = false,
  className = "",
}: RibbonDividerProps) {
  const baseClasses =
    "shrink-0 rounded-full bg-slate-200/90";

  const orientationClasses =
    orientation === "vertical"
      ? compact
        ? "hidden h-6 w-px md:block"
        : "hidden h-8 w-px md:block"
      : compact
        ? "h-px w-full"
        : "h-px w-full";

  return (
    <span
      className={[baseClasses, orientationClasses, className]
        .filter(Boolean)
        .join(" ")}
      {...(decorative
        ? { "aria-hidden": true }
        : {
            role: "separator",
            "aria-orientation": orientation,
          })}
    />
  );
}
