"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
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
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
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

type HomeTask = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
};

type TaskGroup = {
  title: string;
  description: string;
  tasks: HomeTask[];
};

const taskGroups: TaskGroup[] = [
  {
    title: "Organize pages",
    description: "Arrange, remove, rotate, or extract PDF pages.",
    tasks: [
      {
        title: "Merge PDF",
        description: "Combine multiple PDFs into one file.",
        href: "/tools/merge",
        icon: Layers,
        keywords: ["join", "combine", "merge", "multiple pdf"],
      },
      {
        title: "Split PDF",
        description: "Separate one PDF into smaller files.",
        href: "/tools/split",
        icon: Scissors,
        keywords: ["split", "separate", "divide"],
      },
      {
        title: "Reorder Pages",
        description: "Move pages into the right order.",
        href: "/tools/reorder",
        icon: RotateCw,
        keywords: ["reorder", "arrange", "sort", "move pages"],
      },
      {
        title: "Delete Pages",
        description: "Remove unwanted pages from a PDF.",
        href: "/tools/delete-pages",
        icon: Trash2,
        keywords: ["delete", "remove", "pages"],
      },
      {
        title: "Extract Pages",
        description: "Save selected pages as a new PDF.",
        href: "/tools/extract",
        icon: FileText,
        keywords: ["extract", "selected pages", "save pages"],
      },
    ],
  },
  {
    title: "Edit & sign",
    description: "Add information, marks, page numbers, or signatures.",
    tasks: [
      {
        title: "Fill & Sign",
        description: "Add text, dates, marks, signatures, and images.",
        href: "/tools/fill-sign",
        icon: FileSignature,
        keywords: ["sign", "signature", "fill", "form", "date"],
      },
      {
        title: "Watermark PDF",
        description: "Add a watermark to your document.",
        href: "/tools/watermark",
        icon: Sparkles,
        keywords: ["watermark", "stamp", "brand"],
      },
      {
        title: "Page Numbers",
        description: "Add page numbers to PDF pages.",
        href: "/tools/page-numbers",
        icon: Hash,
        keywords: ["page number", "numbering", "footer"],
      },
    ],
  },
  {
    title: "Convert files",
    description: "Move between PDFs and image formats.",
    tasks: [
      {
        title: "Images to PDF",
        description: "Create a PDF from JPG, PNG, or images.",
        href: "/tools/images-to-pdf",
        icon: ImageIcon,
        keywords: ["image", "jpg", "png", "photo", "convert"],
      },
      {
        title: "PDF to Images",
        description: "Export PDF pages as images.",
        href: "/tools/pdf-to-images",
        icon: FileImage,
        keywords: ["pdf to image", "jpg", "png", "export"],
      },
    ],
  },
  {
    title: "Optimize",
    description: "Reduce PDF size for sharing and uploads.",
    tasks: [
      {
        title: "Compress PDF",
        description: "Make PDF files smaller.",
        href: "/tools/compress",
        icon: Minimize2,
        keywords: ["compress", "reduce size", "small pdf", "optimize"],
      },
    ],
  },
];

const quickTasks = [
  "Merge PDF",
  "Compress PDF",
  "Fill & Sign",
  "Reorder Pages",
  "Images to PDF",
  "PDF to Images",
];

const trustItems = [
  "No signup needed",
  "Browser-first tools",
  "Fast everyday PDF actions",
  "Free to start",
];

const workflowHints = [
  {
    title: "I need to combine files",
    action: "Use Merge PDF",
    href: "/tools/merge",
  },
  {
    title: "My PDF is too large",
    action: "Use Compress PDF",
    href: "/tools/compress",
  },
  {
    title: "I need to sign a document",
    action: "Use Fill & Sign",
    href: "/tools/fill-sign",
  },
  {
    title: "Pages are in wrong order",
    action: "Use Reorder Pages",
    href: "/tools/reorder",
  },
];

function getAllTasks() {
  return taskGroups.flatMap((group) => group.tasks);
}

function TaskRow({ task }: { readonly task: HomeTask }) {
  const Icon = task.icon;

  return (
    <Link
      href={task.href}
      className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-[var(--violet-50)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--violet-600)] shadow-sm ring-1 ring-[var(--border-light)] transition group-hover:bg-[var(--violet-600)] group-hover:text-white">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {task.title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
          {task.description}
        </span>
      </span>

      <ArrowRight
        size={16}
        className="shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--violet-600)]"
      />
    </Link>
  );
}

function TaskGroupPanel({ group }: { readonly group: TaskGroup }) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--border-light)] bg-white p-3 shadow-[0_14px_45px_rgba(15,23,42,0.04)]">
      <div className="px-3 py-2">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          {group.title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {group.description}
        </p>
      </div>

      <div className="mt-1 divide-y divide-[var(--border-light)]">
        {group.tasks.map((task) => (
          <TaskRow key={task.href} task={task} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const allTasks = useMemo(() => getAllTasks(), []);
  const normalizedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return allTasks.filter((task) =>
      [
        task.title,
        task.description,
        task.href,
        ...task.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [allTasks, normalizedQuery]);

  function openWorkspace() {
    router.push("/editor");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      openWorkspace();
    }

    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      openWorkspace();
    }
  }

  function openQuickTask(title: string) {
    const task = allTasks.find((item) => item.title === title);

    if (task) {
      router.push(task.href);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <section className="border-b border-[var(--border-light)] bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)]">
          <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-sm">
                  <Zap size={14} className="text-[var(--violet-600)]" />
                  PDF task launcher
                </div>

                <h1 className="display-font mt-4 max-w-xl text-[2rem] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--text-primary)] sm:text-[2.6rem] lg:text-[3.1rem]">
                  What do you want to do with your PDF?
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Upload a PDF, search a task, or choose the action you need. No long homepage journey — just start the work.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(event) => event.preventDefault()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--violet-600)] px-5 text-sm font-bold text-white shadow-[0_16px_35px_rgba(101,80,232,0.22)] transition hover:bg-[var(--violet-500)]"
                  >
                    <Upload size={17} />
                    Upload PDF
                  </button>

                  <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-4 shadow-sm transition focus-within:border-[var(--border-focus)] focus-within:ring-4 focus-within:ring-[rgba(101,80,232,0.10)]">
                    <Search size={17} className="shrink-0 text-[var(--text-muted)]" />

                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search: merge, sign, compress..."
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {quickTasks.map((task) => (
                    <button
                      key={task}
                      type="button"
                      onClick={() => openQuickTask(task)}
                      className="rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-bold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                    >
                      {task}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[var(--text-secondary)]">
                  {trustItems.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[var(--violet-600)]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-white p-3 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
                {normalizedQuery ? (
                  <div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2">
                      <div>
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">
                          Search results
                        </h2>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Matching tools for “{query.trim()}”
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="rounded-full border border-[var(--border-light)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="mt-1 divide-y divide-[var(--border-light)]">
                      {searchResults.length > 0 ? (
                        searchResults.map((task) => (
                          <TaskRow key={task.href} task={task} />
                        ))
                      ) : (
                        <div className="px-3 py-8 text-center">
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
                            <Search size={18} />
                          </div>
                          <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                            No matching task found
                          </h3>
                          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
                            Try words like merge, compress, sign, image, pages, or browse the full tools page.
                          </p>
                          <Link
                            href="/tools"
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--violet-600)] px-4 py-2 text-xs font-bold text-white"
                          >
                            Browse all tools
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {taskGroups.map((group) => (
                      <TaskGroupPanel key={group.title} group={group} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border-light)] bg-slate-50/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Not sure which tool to use?
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Pick the problem. PDFMantra will take you to the right workspace.
                </p>
              </div>

              <Link
                href="/tools"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--violet-600)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-500)]"
              >
                Browse all tools
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {workflowHints.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-[var(--border-light)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
                >
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {item.title}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[var(--violet-600)]">
                    {item.action}
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border-light)] bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center text-xs font-bold text-[var(--text-secondary)] sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={15} className="text-[var(--violet-600)]" />
              Browser-first
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} className="text-[var(--violet-600)]" />
              Fast daily PDF work
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText size={15} className="text-[var(--violet-600)]" />
              Focused tools, not clutter
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--violet-600)]" />
              Clean workspace
            </span>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}