import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("fill-sign");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
