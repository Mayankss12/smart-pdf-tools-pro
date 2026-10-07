import Link from "next/link";

const CONTENT_GROUPS = [
  {
    title: "Edit and sign PDF documents online",
    copy: (
      <>
        Use the <Link href="/editor">online PDF editor</Link> to add text,
        images, highlights and annotations. Complete document workflows with
        the <Link href="/tools/fill-sign">Fill & Sign PDF</Link> tool without
        installing desktop software.
      </>
    ),
  },
  {
    title: "Organize and optimize PDF pages",
    copy: (
      <>
        <Link href="/tools/merge">Merge PDF</Link> files,{" "}
        <Link href="/tools/split">split a PDF</Link> into smaller documents or{" "}
        <Link href="/tools/compress">compress PDF</Link> files for easier
        sharing. Focused page tools also help you reorder, rotate and extract
        pages.
      </>
    ),
  },
  {
    title: "Convert PDFs and search scanned files",
    copy: (
      <>
        Turn documents into useful formats with{" "}
        <Link href="/tools/pdf-to-word">PDF to Word</Link> and image conversion
        tools. Use <Link href="/tools/ocr">PDF OCR</Link> to add a searchable
        text layer to supported scanned documents.
      </>
    ),
  },
] as const;

export function HomeSeoContent() {
  return (
    <section
      className="home-section border-b border-[var(--home-border)] py-12 sm:py-16"
      aria-labelledby="online-pdf-tools-heading"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">A focused document workspace</p>
          <h2
            id="online-pdf-tools-heading"
            className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl"
          >
            Online PDF tools for everyday document work
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            PDFMantra brings essential editing, organization, conversion,
            security and OCR workflows into one responsive browser workspace.
          </p>
        </div>

        <div className="mt-9 grid gap-7 border-t border-slate-200 pt-8 md:grid-cols-3">
          {CONTENT_GROUPS.map((group) => (
            <article key={group.title}>
              <h3 className="text-lg font-bold tracking-[-0.025em] text-slate-950">
                {group.title}
              </h3>
              <p className="home-seo-copy mt-3 text-sm leading-7 text-slate-600">
                {group.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
