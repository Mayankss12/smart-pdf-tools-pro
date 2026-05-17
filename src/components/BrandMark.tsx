import type { SVGProps } from "react";

export interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  readonly title?: string;
}

/**
 * PDFMantra mark — folded document + clear "M" monogram.
 * The document body uses a solid high-contrast brand fill so it remains
 * visible at small header sizes and on pale violet page backgrounds.
 */
export function BrandMark({
  title = "PDFMantra",
  ...props
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      {...props}
    >
      <defs>
        <linearGradient id="pdfmantra-fold" x1="38" y1="6" x2="54" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C2B8FF" />
          <stop offset="1" stopColor="#7F70F6" />
        </linearGradient>
        <linearGradient id="pdfmantra-base" x1="12" y1="52" x2="54" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3450DF" />
          <stop offset="1" stopColor="#2039C8" />
        </linearGradient>
      </defs>

      <path
        d="M17.5 6.5H38.1L53.5 21.9V55.2C53.5 58.68 50.68 61.5 47.2 61.5H17.5C14.02 61.5 11.2 58.68 11.2 55.2V12.8C11.2 9.32 14.02 6.5 17.5 6.5Z"
        fill="#1D2BB7"
        stroke="#15259D"
        strokeWidth="1.15"
      />
      <path
        d="M38.1 6.5V17.65C38.1 20.08 40.07 22.05 42.5 22.05H53.5L38.1 6.5Z"
        fill="url(#pdfmantra-fold)"
      />
      <path
        d="M11.2 51.2L23.1 41.75L32.35 49.45L41.7 41.75L53.5 51.2V55.2C53.5 58.68 50.68 61.5 47.2 61.5H17.5C14.02 61.5 11.2 58.68 11.2 55.2V51.2Z"
        fill="url(#pdfmantra-base)"
      />

      <path
        d="M18.95 31.05V52.8H26.05V42.9L32.35 48.2L38.55 42.9V52.8H45.65V31.05L32.35 42.15L18.95 31.05Z"
        fill="#FFFFFF"
      />
      <path
        d="M20.15 17.6L21.85 21.35L25.6 23.05L21.85 24.75L20.15 28.5L18.45 24.75L14.7 23.05L18.45 21.35L20.15 17.6Z"
        fill="#C5BAFF"
      />
    </svg>
  );
}
