import Link from "next/link";
import { ArrowUpRight, Globe2, Linkedin, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Tools", href: "/tools" },
      { label: "Editor", href: "/editor" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "PDF tools",
    links: [
      { label: "Merge PDF", href: "/tools/merge" },
      { label: "Split PDF", href: "/tools/split" },
      { label: "Compress PDF", href: "/tools/compress" },
      { label: "Highlight PDF", href: "/tools/highlight-pdf" },
      { label: "Watermark PDF", href: "/tools/watermark" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Security", href: "/security" },
      { label: "About us", href: "/about" },
      { label: "Desktop", href: "/desktop" },
      { label: "Protect PDF", href: "/tools/protect" },
      { label: "OCR PDF", href: "/tools/ocr" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { label: "Sign PDF", href: "/editor" },
      { label: "Images to PDF", href: "/tools/images-to-pdf" },
      { label: "PDF to Images", href: "/tools/pdf-to-images" },
      { label: "Page Numbers", href: "/tools/page-numbers" },
      { label: "Organize PDF", href: "/tools/organize" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#252631] text-white">
      <div className="mx-auto max-w-[1480px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.18fr_repeat(4,0.82fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3">
              <BrandMark className="h-11 w-11 shrink-0" />
              <div>
                <div className="display-font text-[1.6rem] font-semibold leading-none tracking-[-0.035em] text-white">
                  PDFMantra
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  Smart PDF Workspace
                </div>
              </div>
            </Link>

            <p className="mt-5 text-sm font-normal leading-7 text-white/68">
              A cleaner way to edit, organize, convert, and secure PDFs through focused document workflows.
            </p>

            <Link
              href="/tools"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/14"
            >
              <Sparkles size={15} />
              Explore PDF Tools
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.05em] text-white">
                {group.title}
              </h3>
              <div className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm font-medium text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/14 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/64">
            <span>© 2026 PDFMantra</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:inline-block" />
            <span>Built for focused PDF work</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3.5 py-2 text-sm font-semibold text-white/78">
              <Globe2 size={15} />
              English
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white/78">
              <Linkedin size={16} />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
