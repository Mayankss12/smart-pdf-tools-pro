import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("pdf-to-powerpoint");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
