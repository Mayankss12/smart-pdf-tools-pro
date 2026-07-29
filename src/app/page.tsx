import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ConversionHub } from "@/components/home/ConversionHub";
import { EditorShowcase } from "@/components/home/EditorShowcase";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";
import { HomeHero } from "@/components/home/HomeHero";
import { HomepageTrustStrip } from "@/components/home/HomepageTrustStrip";
import { PopularTools } from "@/components/home/PopularTools";
import { ProcessingPrivacy } from "@/components/home/ProcessingPrivacy";
import { ProductProof } from "@/components/home/ProductProof";
import { ToolExplorer } from "@/components/home/ToolExplorer";
import { WorkflowStories } from "@/components/home/WorkflowStories";
import { getHomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import { assertHomepageCuratedIds } from "@/lib/home/homepage-tools";

export const metadata: Metadata = {
  title: "PDF Editor, OCR, Conversion and Document Tools",
  description:
    "Edit, organize, compress, sign, OCR and convert PDFs with browser-based tools and clearly labelled secure-provider workflows in PDFMantra.",
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
      <main className="home-shell min-h-screen bg-[#fbfaf7] text-slate-950">
        <HomeHero capabilities={capabilities} />
        <HomepageTrustStrip />
        <PopularTools capabilities={capabilities} />
        <ToolExplorer capabilities={capabilities} />
        <EditorShowcase />
        <ConversionHub capabilities={capabilities} />
        <WorkflowStories />
        <ProcessingPrivacy capabilities={capabilities} />
        <ProductProof />
        <HomeFaq />
        <HomeFinalCta />
      </main>
      <Footer />
    </>
  );
}

