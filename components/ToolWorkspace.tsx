import { ReactNode } from "react";
export function ToolWorkspace({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><div className="space-y-4">{left}</div><div>{right}</div></div>;
}
