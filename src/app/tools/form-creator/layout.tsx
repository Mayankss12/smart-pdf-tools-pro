import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("form-creator");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
