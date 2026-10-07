import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("batch-workflows");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
