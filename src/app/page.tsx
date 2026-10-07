import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { EditorShowcase } from "@/components/home/EditorShowcase";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSeoContent } from "@/components/home/HomeSeoContent";
import { HomeToolsGrid } from "@/components/home/HomeToolsGrid";
import { ProcessingPrivacy } from "@/components/home/ProcessingPrivacy";
import { getHomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import {
  assertHomepageCuratedIds,
  getHomepageToolGridTools,
} from "@/lib/home/homepage-tools";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Online PDF Editor, Converter & PDF Tools",
  description:
    "Edit, merge, split, compress, sign, protect, OCR and convert PDFs online with PDFMantra. Focused browser-based tools for everyday documents.",
  keywords: [
    "online PDF editor",
    "PDF tools",
    "edit PDF online",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "sign PDF",
    "PDF OCR",
    "PDF converter",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PDFMantra — Online PDF Editor, Converter & PDF Tools",
    description:
      "Edit, organize, compress, sign, protect, OCR and convert PDFs in one focused online workspace.",
    url: "/",
    siteName: "PDFMantra",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFMantra — Online PDF Editor & PDF Tools",
    description:
      "Edit, merge, split, compress, sign, protect, OCR and convert PDFs online.",
  },
};

export default function HomePage() {
  const capabilities = getHomepageCapabilitySnapshot();
  assertHomepageCuratedIds(capabilities);
  const featuredTools = getHomepageToolGridTools(capabilities);
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "PDFMantra",
        alternateName: ["PDF Mantra", "PDFMantra PDF Tools"],
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        disambiguatingDescription:
          "PDFMantra is PDF productivity software for working with user-provided documents online.",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "PDFMantra",
        alternateName: "PDFMantra PDF Tools",
        url: siteUrl,
        description:
          "An online workspace for editing, organizing, converting, signing, protecting and searching PDF documents.",
        disambiguatingDescription:
          "PDFMantra is an online PDF software application, not a document-download or religious-text library.",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#application`,
        name: "PDFMantra",
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser",
        description:
          "Online PDF editing, organization, conversion, signing, security and OCR tools.",
        disambiguatingDescription:
          "A browser-based PDF productivity application for editing and processing documents supplied by the user.",
        featureList: [
          "Edit PDF documents",
          "Merge, split and organize PDF pages",
          "Compress and convert PDF files",
          "Fill, sign and protect PDFs",
          "Run OCR on scanned PDFs",
        ],
      },
      {
        "@type": "ItemList",
        name: "Most-used PDFMantra tools",
        numberOfItems: featuredTools.length,
        itemListElement: featuredTools.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: tool.title,
          url: new URL(tool.href, siteUrl).toString(),
        })),
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="home-shell min-h-screen text-slate-950">
        <HomeHero />
        <HomeToolsGrid capabilities={capabilities} />
        <HomeSeoContent />
        <EditorShowcase />
        <ProcessingPrivacy />
        <HomeFaq />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

