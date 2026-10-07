import { buildToolMetadata } from "@/lib/tool-metadata";
import { ToolGuideRouteLayout } from "@/components/ToolGuideRouteLayout";

export const metadata = buildToolMetadata("compare-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolGuideRouteLayout toolId="compare-pdf">{children}</ToolGuideRouteLayout>;
}
