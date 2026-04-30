import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDFMantra",
  description: "Smart PDF editing and document tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
