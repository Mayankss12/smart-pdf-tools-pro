import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("html-to-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
