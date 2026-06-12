"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileImage,
  FileSignature,
  FileText,
  Hash,
  Image as ImageIcon,
  Layers,
  Minimize2,
  RotateCw,
  Scissors,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type PdfAction = {
  title: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
};

type ActionGroup = {
  title: string;
  actions: PdfAction[];
};

const popularActions: PdfAction[] = [
  {
    title: "Merge PDF",
    href: "/tools/merge",
    icon: Layers,
    keywords: ["merge", "combine", "join", "multiple pdf"],
  },
  {
    title: "Compress PDF",
    href: "/tools/compress",
    icon: Minimize2,
    keywords: ["compress", "reduce size", "small pdf", "optimize"],
  },
  {
    title: "Fill & Sign",
    href: "/tools/fill-sign",
    icon: FileSignature,
    keywords: ["sign", "signature", "fill", "form", "date"],
  },
  {
    title: "Edit PDF",
    href: "/editor",
    icon: FileText,
    keywords: ["edit", "text", "highlight", "annotate", "editor"],
  },
  {
    title: "Images to PDF",
    href: "/tools/images-to-pdf",
    icon: ImageIcon,
    keywords: ["image", "jpg", "png", "photo", "convert"],
  },
  {
    title: "PDF to Images",
    href: "/tools/pdf-to-images",
    icon: FileImage,
    keywords: ["pdf to image", "jpg", "png", "export"],
  },
  {
    title: "Reorder Pages",
    href: "/tools/reorder",
    icon: RotateCw,
    keywords: ["reorder", "arrange", "sort", "move pages"],
  },
  {
    title: "Delete Pages",
    href: "/tools/delete-pages",
    icon: Trash2,
    keywords: ["delete", "remove", "pages"],
  },
];

const actionGroups: ActionGroup[] = [
  {
    title: "Organize pages",
    actions: [
      {
        title: "Merge PDF",
        href: "/tools/merge",
        icon: Layers,
        keywords: ["merge", "combine", "join"],
      },
      {
        title: "Split PDF",
        href: "/tools/split",
        icon: Scissors,
        keywords: ["split", "separate", "divide"],
      },
      {
        title: "Reorder Pages",
        href: "/tools/reorder",
        icon: RotateCw,
        keywords: ["reorder", "arrange", "sort"],
      },
      {
        title: "Delete Pages",
        href: "/tools/delete-pages",
        icon: Trash2,
        keywords: ["delete", "remove", "pages"],
      },
      {
        title: "Extract Pages",
        href: "/tools/extract",
        icon: FileText,
        keywords: ["extract", "selected pages"],
      },
    ],
  },
  {
    title: "Edit & sign",
    actions: [
      {
        title: "Edit PDF",
        href: "/editor",
        icon: FileText,
        keywords: ["edit", "annotate", "highlight", "text"],
      },
      {
        title: "Fill & Sign",
        href: "/tools/fill-sign",
        icon: FileSignature,
        keywords: ["sign", "signature", "fill"],
      },
      {
        title: "Watermark PDF",
        href: "/tools/watermark",
        icon: ShieldCheck,
        keywords: ["watermark", "stamp"],
      },
      {
        title: "Page Numbers",
        href: "/tools/page-numbers",
        icon: Hash,
        keywords: ["page number", "numbering"],
      },
    ],
  },
  {
    title: "Convert files",
    actions: [
      {
        title: "Images to PDF",
        href: "/tools/images-to-pdf",
        icon: ImageIcon,
        keywords: ["image", "jpg", "png", "photo"],
      },
      {
        title: "PDF to Images",
        href: "/tools/pdf-to-images",
        icon: FileImage,
        keywords: ["pdf to image", "jpg", "png"],
      },
    ],
  },
  {
    title: "Optimize",
    actions: [
      {
        title: "Compress PDF",
        href: "/tools/compress",
        icon: Minimize2,
        keywords: ["compress", "reduce size", "small pdf"],
      },
    ],
  },
];

const trustItems = [
  "No signup",
  "Browser-first",
  "Fast PDF tools",
  "Free to start",
] as const;

function getAllActions() {
  const map = new Map<string, PdfAction>();

  [...popularActions, ...actionGroups.flatMap((group) => group.actions)].forEach(
    (action) => {
      map.set(action.href, action);
    }
  );

  return Array.from(map.values());
}

function ActionPill({ action }: { readonly action: PdfAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-sm font-bold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
    >
      <Icon size={15} className="text-[var(--violet-600)]" />
      {action.title}
    </Link>
  );
}

function CompactActionRow({ action }: { readonly action: PdfAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={16} className="shrink-0 text-[var(--violet-600)]" />
        <span className="truncate">{action.title}</span>
      </span>

      <ArrowRight size={14} className="shrink-0 text-[var(--text-muted)]" />
    </Link>
  );
}

function ActionAccordion({ group }: { readonly group: ActionGroup }) {
  return (
    <details className="group border-b border-[var(--border-light)] py-2 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:bg-slate-50">
        {group.title}
        <ChevronDown
          size={16}
          className="shrink-0 text-[var(--text-muted)] transition group-open:rotate-180"
        />
      </summary>

      <div className="pb-2 pl-1 pt-1">
        {group.actions.map((action) => (
          <CompactActionRow key={action.href} action={action} />
        ))}
      </div>
    </details>
  );
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const allActions = useMemo(() => getAllActions(), []);
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return allActions.filter((action) =>
      [action.title, action.href, ...action.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [allActions, normalizedQuery]);

  function openEditor() {
    router.push("/editor");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      openEditor();
    }

    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      openEditor();
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f5ff_100%)] text-[var(--text-primary)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <section className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="text-center">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-sm">
              <FileText size={14} className="text-[var(--violet-600)]" />
              PDFMantra
            </p>

            <h1 className="display-font mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-[-0.035em] text-[var(--text-primary)] sm:text-4xl">
              What do you want to do with your PDF?
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Upload a file or choose a PDF action. No signup, no confusion.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-3xl rounded-[1.75rem] border border-[var(--border-light)] bg-white p-4 shadow-[0_22px_70px_rgba(15,23,42,0.07)] sm:p-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              className="flex min-h-24 w-full flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed border-[var(--border-focus)] bg-[var(--violet-50)] px-4 py-5 text-center transition hover:bg-[var(--violet-100)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_30px_rgba(101,80,232,0.22)]">
                <Upload size={20} />
              </span>

              <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                Upload or drop PDF
              </span>

              <span className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                Open the workspace and start editing
              </span>
            </button>

            <div className="mt-4">
              <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-4 shadow-sm transition focus-within:border-[var(--border-focus)] focus-within:ring-4 focus-within:ring-[rgba(101,80,232,0.10)]">
                <Search size={16} className="shrink-0 text-[var(--text-muted)]" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tools: merge, sign, compress..."
                  className="w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>
            </div>

            {normalizedQuery ? (
              <div className="mt-3 rounded-2xl border border-[var(--border-light)] bg-slate-50 p-2">
                {results.length > 0 ? (
                  results.map((action) => (
                    <CompactActionRow key={action.href} action={action} />
                  ))
                ) : (
                  <div className="px-3 py-5 text-center text-sm font-semibold text-[var(--text-secondary)]">
                    No matching tool found.
                  </div>
                )}
              </div>
            ) : null}

            {!normalizedQuery ? (
              <>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {popularActions.map((action) => (
                    <ActionPill key={action.href} action={action} />
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--border-light)] bg-slate-50/70 px-2">
                  {actionGroups.map((group) => (
                    <ActionAccordion key={group.title} group={group} />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-[var(--text-secondary)] sm:text-sm">
            {trustItems.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[var(--violet-600)]" />
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
            >
              Browse all tools
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}