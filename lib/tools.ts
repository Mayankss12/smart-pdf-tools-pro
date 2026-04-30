import {
  Archive,
  Edit3,
  FileImage,
  Hash,
  Image,
  Merge,
  PenLine,
  RotateCw,
  Scissors,
  Stamp,
  Trash2,
} from "lucide-react";

export const tools = [
  {
    name: "PDF Editor",
    href: "/editor",
    icon: Edit3,
    desc: "Add text, image, signature, highlight and edit layers.",
  },
  {
    name: "Merge PDF",
    href: "/tools/merge",
    icon: Merge,
    desc: "Combine multiple PDF files.",
  },
  {
    name: "Split PDF",
    href: "/tools/split",
    icon: Scissors,
    desc: "Split PDF by pages.",
  },
  {
    name: "Compress PDF",
    href: "/tools/compress",
    icon: Archive,
    desc: "Reduce PDF size with browser-side optimization.",
  },
  {
    name: "Rotate PDF",
    href: "/tools/rotate",
    icon: RotateCw,
    desc: "Rotate all pages by 90, 180, or 270 degrees.",
  },
  {
    name: "Delete PDF Pages",
    href: "/tools/delete-pages",
    icon: Trash2,
    desc: "Select and remove unwanted pages from your PDF.",
  },
  {
    name: "Images to PDF",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    desc: "Create PDF from images.",
  },
  {
    name: "PDF to Images",
    href: "/tools/pdf-to-images",
    icon: Image,
    desc: "Convert PDF pages to PNG images.",
  },
  {
    name: "Watermark PDF",
    href: "/tools/watermark",
    icon: Stamp,
    desc: "Add custom watermark text to PDF pages.",
  },
  {
    name: "Page Numbers",
    href: "/tools/page-numbers",
    icon: Hash,
    desc: "Add draggable page numbers to your PDF.",
  },
  {
    name: "Fill & Sign",
    href: "/tools/fill-sign",
    icon: PenLine,
    desc: "Add text or image signatures to any PDF page.",
  },
];
