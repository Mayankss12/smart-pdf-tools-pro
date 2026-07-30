import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ConversionHub } from "@/components/home/ConversionHub";
import { EditorShowcase } from "@/components/home/EditorShowcase";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHero } from "@/components/home/HomeHero";
import { PopularTools } from "@/components/home/PopularTools";
import { ProcessingPrivacy } from "@/components/home/ProcessingPrivacy";
import { ToolExplorer } from "@/components/home/ToolExplorer";
import { getHomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import { assertHomepageCuratedIds } from "@/lib/home/homepage-tools";

export const metadata: Metadata = {
  title: "PDF Editor, OCR, Conversion and Document Tools",
  description:
    "Edit, organize, compress, sign, OCR and convert PDFs with focused online tools from PDFMantra.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PDFMantra — One workspace for real PDF work",
    description:
      "Start with a file or choose a focused PDF editor, page, OCR, signing or conversion workflow.",
    url: "/",
  },
};

export default function HomePage() {
  assertHomepageCuratedIds();
  const capabilities = getHomepageCapabilitySnapshot();

  return (
    <>
      <Header />
      <main className="home-shell min-h-screen text-slate-950">
        <HomeHero capabilities={capabilities} />
        <PopularTools capabilities={capabilities} />
        <ToolExplorer capabilities={capabilities} />
        <EditorShowcase />
        <ConversionHub capabilities={capabilities} />
        <ProcessingPrivacy />
        <HomeFaq />
      </main>
      <Footer />
    </>
  );
}

