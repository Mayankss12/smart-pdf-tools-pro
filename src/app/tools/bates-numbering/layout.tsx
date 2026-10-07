import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("bates-numbering");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
