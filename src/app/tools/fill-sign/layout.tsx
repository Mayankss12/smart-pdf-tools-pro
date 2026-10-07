import { buildToolMetadata } from "@/lib/tool-metadata";
import { ToolGuideRouteLayout } from "@/components/ToolGuideRouteLayout";

export const metadata = buildToolMetadata("fill-sign");

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ToolGuideRouteLayout toolId="fill-sign">{children}</ToolGuideRouteLayout>;
}
