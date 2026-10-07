import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("jpg-to-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
