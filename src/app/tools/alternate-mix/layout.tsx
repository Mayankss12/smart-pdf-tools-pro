import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("alternate-mix");

export default function ToolRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
