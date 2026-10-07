import type { Metadata } from "next";

import { Header } from "@/components/Header";
import { ToolsDirectoryClient } from "@/components/ToolsDirectoryClient";
import { getPublicToolsDirectory } from "@/lib/public-launch";
import { getPublicLaunchCapabilitySnapshot } from "@/lib/public-launch-snapshot";

export const metadata: Metadata = {
  title: "All Online PDF Tools",
  description:
    "Browse PDFMantra tools for editing, organizing, converting, compressing, signing, protecting and searching PDF documents online.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "All Online PDF Tools | PDFMantra",
    description:
      "Browse PDFMantra tools for editing, organizing, converting, compressing, signing, protecting and searching PDFs.",
    url: "/tools",
  },
};

export default function ToolsPage() {
  const capabilitySnapshot = getPublicLaunchCapabilitySnapshot();
  const launchReadyToolIds = getPublicToolsDirectory(
    capabilitySnapshot,
  ).map((tool) => tool.id);

  return (
    <>
      <Header />
      <ToolsDirectoryClient launchReadyToolIds={launchReadyToolIds} />
    </>
  );
}
