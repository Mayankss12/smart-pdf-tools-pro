import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("pdf-to-text");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
