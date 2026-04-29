import { Edit3, Merge, Scissors, Archive, Image, FileImage, Lock, PenLine } from "lucide-react";

export const tools = [
  { name: "PDF Editor", href: "/editor", icon: Edit3, desc: "Add text, image, signature, highlight and edit layers." },
  { name: "Merge PDF", href: "/tools/merge", icon: Merge, desc: "Combine multiple PDF files." },
  { name: "Split PDF", href: "/tools/split", icon: Scissors, desc: "Split PDF by pages." },
  { name: "Compress PDF", href: "/tools/compress", icon: Archive, desc: "Reduce PDF size." },
  { name: "PDF to Images", href: "/tools/pdf-to-images", icon: Image, desc: "Convert pages to images." },
  { name: "Images to PDF", href: "/tools/images-to-pdf", icon: FileImage, desc: "Create PDF from images." },
  { name: "Protect PDF", href: "/tools/protect", icon: Lock, desc: "Password protect PDF." },
  { name: "Fill & Sign", href: "/tools/fill-sign", icon: PenLine, desc: "Fill and sign documents." }
];
