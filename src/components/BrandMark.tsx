import type { SVGProps } from "react";

export interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  readonly title?: string;
}

/**
 * PDFMantra brand mark — folded PDF document + infinity loop.
 * Built for the light violet product theme and clear header/favicon usage.
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
        <linearGradient id="pdfmantra-document" x1="10" y1="8" x2="55" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBF9FF" />
          <stop offset="0.5" stopColor="#F1ECFF" />
          <stop offset="1" stopColor="#E6DBFF" />
        </linearGradient>

        <linearGradient id="pdfmantra-violet" x1="13" y1="11" x2="55" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="0.45" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>

        <linearGradient id="pdfmantra-fold" x1="39" y1="8" x2="55" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      <path
        d="M17.8 7.6H38.9L55.1 23.8V51.1C55.1 56 51.1 60 46.2 60H17.8C12.9 60 8.9 56 8.9 51.1V16.5C8.9 11.6 12.9 7.6 17.8 7.6Z"
        fill="url(#pdfmantra-document)"
        stroke="url(#pdfmantra-violet)"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      <path
        d="M38.9 7.6V18.9C38.9 21.6 41.1 23.8 43.8 23.8H55.1L38.9 7.6Z"
        fill="url(#pdfmantra-fold)"
      />

      <path
        d="M15.8 47.8C15.8 51.1 18.5 53.7 21.7 53.7H47.9"
        stroke="url(#pdfmantra-violet)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="M18.8 34.1C23.5 25.9 31.7 25.9 36.4 34.1C41.2 42.4 49.3 42.4 54.1 34.1"
        stroke="url(#pdfmantra-violet)"
        strokeWidth="5.2"
        strokeLinecap="round"
      />

      <path
        d="M18.8 34.1C23.5 42.4 31.7 42.4 36.4 34.1C41.2 25.9 49.3 25.9 54.1 34.1"
        stroke="url(#pdfmantra-violet)"
        strokeWidth="5.2"
        strokeLinecap="round"
      />

      <path
        d="M21.2 17.8H31.7"
        stroke="#C4B5FD"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M21.2 24.4H34.2"
        stroke="#DDD6FE"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
