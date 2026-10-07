import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("flatten-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
