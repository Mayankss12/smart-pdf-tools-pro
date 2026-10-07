import { buildToolMetadata } from "@/lib/tool-metadata";
import { ToolGuideRouteLayout } from "@/components/ToolGuideRouteLayout";

export const metadata = buildToolMetadata("reorder-pages");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolGuideRouteLayout toolId="reorder-pages">{children}</ToolGuideRouteLayout>;
}
