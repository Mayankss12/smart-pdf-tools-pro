import type { SVGProps } from "react";

export interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  readonly title?: string;
}

/**
 * Original PDFMantra brand mark.
 * --------------------------------------------
 * A folded document shape nested inside a soft gear orbit.
 * This keeps the mark product-relevant without copying another PDF brand.
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
        <linearGradient id="pdfmantra-gear" x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8C63FF" />
          <stop offset="0.52" stopColor="#7254F7" />
          <stop offset="1" stopColor="#A85CFF" />
        </linearGradient>
        <linearGradient id="pdfmantra-paper" x1="20" y1="16" x2="45" y2="49" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEE8FF" />
        </linearGradient>
      </defs>

      <path
        d="M32 5.5L36.4 8.3L41.6 7.7L44.6 11.8L49.7 13L50.8 18.2L55.3 20.7L54.6 26L58.5 29.6L56.7 34.6L59.2 39.4L56.1 43.4L56.9 48.6L52.5 51.2L51.4 56.3L46.2 57.5L43.2 61.6L38 61L33.6 63.8L29.2 61L24 61.6L21 57.5L15.8 56.3L14.7 51.2L10.3 48.6L11.1 43.4L8 39.4L10.5 34.6L8.7 29.6L12.6 26L11.9 20.7L16.4 18.2L17.5 13L22.6 11.8L25.6 7.7L30.8 8.3L32 5.5Z"
        fill="url(#pdfmantra-gear)"
      />

      <circle cx="32" cy="33" r="21" fill="rgba(255,255,255,0.14)" />

      <path
        d="M23 17.5H37.8L45 24.8V47.5C45 49.433 43.433 51 41.5 51H23C21.067 51 19.5 49.433 19.5 47.5V21C19.5 19.067 21.067 17.5 23 17.5Z"
        fill="url(#pdfmantra-paper)"
      />
      <path d="M37.5 17.5V24.6H44.6" stroke="#D9CCFF" strokeWidth="2.2" strokeLinejoin="round" />

      <path d="M25 31H39" stroke="#7657FF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25 37H39" stroke="#7657FF" strokeWidth="2.5" strokeLinecap="round" opacity="0.92" />
      <path d="M25 43H34.5" stroke="#A35DFF" strokeWidth="2.5" strokeLinecap="round" />

      <circle cx="48.7" cy="45.5" r="8.2" fill="#FFFFFF" />
      <path
        d="M48.7 40.7L49.9 42.6L52.1 42.3L52.8 44.4L54.8 45.5L52.8 46.6L52.1 48.7L49.9 48.4L48.7 50.3L47.5 48.4L45.3 48.7L44.6 46.6L42.6 45.5L44.6 44.4L45.3 42.3L47.5 42.6L48.7 40.7Z"
        fill="#7657FF"
      />
      <circle cx="48.7" cy="45.5" r="2.45" fill="#FFFFFF" />
    </svg>
  );
}
