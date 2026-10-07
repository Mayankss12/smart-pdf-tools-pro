import { buildToolMetadata } from "@/lib/tool-metadata";

export const metadata = buildToolMetadata("csv-to-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
