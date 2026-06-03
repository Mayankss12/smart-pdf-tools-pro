"use client";

export type StatusBarType = "info" | "success" | "error";

export type StatusBarProps = {
  message: string;
  type?: StatusBarType;
};

function getStatusClass(type: StatusBarType) {
  if (type === "success") return "text-emerald-600";
  if (type === "error") return "text-red-600";
  return "text-slate-500";
}

export function StatusBar({ message, type = "info" }: StatusBarProps) {
  if (!message.trim()) return null;

  return (
    <p className={`mt-3 px-1 text-sm font-semibold ${getStatusClass(type)}`}>
      {message}
    </p>
  );
}
