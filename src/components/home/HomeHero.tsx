import Link from "next/link";
import {
  ArrowDown,
  FileText,
  Fingerprint,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";

export function HomeHero() {
  return (
    <section className="home-futuristic-hero relative overflow-hidden border-b border-[var(--home-border)]">
      <div className="home-hero-grid" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[610px] max-w-[1320px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-16">
        <div className="relative z-10 max-w-[650px] text-center lg:text-left">
          <p className="home-hero-kicker justify-center lg:justify-start">
            <span aria-hidden="true" />
            The intelligent PDF workspace
          </p>

          <h1 className="mt-7 text-[3.25rem] font-bold leading-[0.94] tracking-[-0.07em] text-slate-950 sm:text-[4.4rem] lg:text-[5.15rem]">
            Documents,
            <span className="block">shaped</span>
            <em className="home-hero-script block font-medium">beautifully.</em>
          </h1>

          <p className="mx-auto mt-7 max-w-[590px] text-base leading-8 text-slate-600 sm:text-lg lg:mx-0">
            Edit, convert, organize, compress, sign, protect and OCR PDFs
            online in one calm, powerful workspace designed for serious work.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/editor" className="home-hero-primary">
              Choose a PDF
              <Upload size={17} aria-hidden="true" />
            </Link>
            <Link href="#pdf-tools" className="home-hero-secondary">
              Explore popular tools
              <ArrowDown size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-medium text-slate-600 lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={15} className="text-violet-700" aria-hidden="true" />
              Privacy-first workflows
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap size={15} className="text-violet-700" aria-hidden="true" />
              No software installation
            </span>
          </div>
        </div>

        <div
          className="home-document-art relative mx-auto h-[430px] w-full max-w-[570px]"
          aria-label="Layered PDF documents representing PDFMantra editing and conversion tools"
          role="img"
        >
          <div className="home-art-glow" aria-hidden="true" />
          <div className="home-art-orbit home-art-orbit-one" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="home-art-orbit home-art-orbit-two" aria-hidden="true">
            <i />
            <i />
          </div>

          <div className="home-art-document home-art-document-back" aria-hidden="true">
            <FileText size={25} />
            <span />
            <span />
          </div>
          <div className="home-art-document home-art-document-middle" aria-hidden="true">
            <div className="home-art-chart">
              <i />
              <i />
              <i />
            </div>
            <span />
            <span />
          </div>
          <div className="home-art-document home-art-document-front" aria-hidden="true">
            <b>P</b>
            <strong>
              One document.
              <br />
              Every possibility.
            </strong>
            <div className="home-art-copy-lines">
              <i />
              <i />
              <i />
            </div>
            <span className="home-art-fold" />
          </div>

          <div className="home-art-chip home-art-chip-edit" aria-hidden="true">
            <WandSparkles size={15} />
            Smart edit
          </div>
          <div className="home-art-chip home-art-chip-secure" aria-hidden="true">
            <Fingerprint size={18} />
          </div>
          <div className="home-art-chip home-art-chip-spark" aria-hidden="true">
            <Sparkles size={16} />
          </div>
        </div>
      </div>
    </section>
  );
}

