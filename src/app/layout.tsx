import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  themeColor: "#7657ff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-[var(--pm-bg)] font-sans text-[var(--pm-ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
