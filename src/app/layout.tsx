import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/tokens.css";
import "./globals.css";

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://smart-pdf-tools-pro.vercel.app"),
  title: {
    default: "PDFMantra - Smart PDF Workspace",
    template: "%s | PDFMantra",
  },
  description:
    "PDFMantra is a modern PDF workspace for editing, signing, highlighting, organizing, and preparing documents with browser-side tools and backend-ready premium workflows.",
  keywords: [
    "PDF editor",
    "edit PDF",
    "sign PDF",
    "highlight PDF",
    "PDF tools",
    "compress PDF",
    "merge PDF",
    "split PDF",
    "PDFMantra",
  ],
  applicationName: "PDFMantra",
  creator: "PDFMantra",
  publisher: "PDFMantra",
  openGraph: {
    title: "PDFMantra - Smart PDF Workspace",
    description:
      "Modern PDF tools for editing, signing, highlighting, and document workflows.",
    url: "https://smart-pdf-tools-pro.vercel.app",
    siteName: "PDFMantra",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFMantra - Smart PDF Workspace",
    description:
      "Modern PDF tools for editing, signing, highlighting, and document workflows.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b4ecc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen bg-[var(--cream-base)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
