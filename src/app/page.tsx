import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { EditorShowcase } from "@/components/home/EditorShowcase";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeToolsGrid } from "@/components/home/HomeToolsGrid";
import { ProcessingPrivacy } from "@/components/home/ProcessingPrivacy";
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
    title: "PDFMantra — Every PDF tool you need, in one place",
    description:
      "Edit, organize, compress, sign, OCR and convert PDFs with focused online tools.",
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
        <HomeHero />
        <HomeToolsGrid capabilities={capabilities} />
        <EditorShowcase />
        <ProcessingPrivacy />
        <HomeFaq />
      </main>
      <Footer />
    </>
  );
}

