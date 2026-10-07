import { buildToolMetadata } from "@/lib/tool-metadata";
import { ToolGuideRouteLayout } from "@/components/ToolGuideRouteLayout";

export const metadata = buildToolMetadata("jpg-to-pdf");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolGuideRouteLayout toolId="jpg-to-pdf">{children}</ToolGuideRouteLayout>;
}
