import { buildToolMetadata } from "@/lib/tool-metadata";
import { ToolGuideRouteLayout } from "@/components/ToolGuideRouteLayout";

export const metadata = buildToolMetadata("rotate-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolGuideRouteLayout toolId="rotate-pdf">{children}</ToolGuideRouteLayout>;
}
