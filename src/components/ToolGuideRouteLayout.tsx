import { ToolSeoGuide } from "@/components/ToolSeoGuide";
import { TOOL_GUIDES } from "@/lib/tool-guides";

export function ToolGuideRouteLayout({
  children,
  toolId,
}: Readonly<{
  children: React.ReactNode;
  toolId: keyof typeof TOOL_GUIDES;
}>) {
  return (
    <>
      {children}
      <ToolSeoGuide guide={TOOL_GUIDES[toolId]} />
    </>
  );
}
