"use client";

import { useMemo, useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { PdfPreview } from "@/components/PdfPreview";
import { StatusCard } from "@/components/StatusCard";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob, parseSplitGroups, splitPdfByGroups } from "@/lib/pdf-utils";
import { PDFDocument } from "pdf-lib";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [groupsInput, setGroupsInput] = useState("1-4,5-8");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [status, setStatus] = useState(
    "Use comma to create separate split files. Example: 1-4,5-8 creates two PDFs.",
  );

  const parsedGroups = useMemo(() => {
    if (!pageCount) return { groups: [], error: "" };
    try {
      return { groups: parseSplitGroups(groupsInput, pageCount), error: "" };
    } catch (error) {
      return { groups: [], error: error instanceof Error ? error.message : "Invalid split groups." };
    }
  }, [groupsInput, pageCount]);

  async function runSplit() {
    if (!file) {
      setStatus("Please upload one PDF.");
      return;
    }

    try {
      const blobs = await splitPdfByGroups(file, groupsInput);
      blobs.forEach((blob, index) => downloadBlob(blob, `pdfmantra-split-${index + 1}.pdf`));
      setStatus(`Downloaded ${blobs.length} split file(s).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Split failed.");
    }
  }

  return (
    <ToolShell
      title="Split PDF"
      description="Split one PDF into separate files by entering comma-separated groups."
    >
      <div className="space-y-4">
        <FileDropzone
          label="Upload one PDF"
          accept="application/pdf,.pdf"
          onFiles={async (files) => {
            const selected = files[0] || null;
            setFile(selected);
            setStatus("Use comma to create separate split files. Example: 1-4,5-8 creates two PDFs.");
            if (!selected) {
              setPageCount(null);
              return;
            }
            try {
              const pdf = await PDFDocument.load(await selected.arrayBuffer());
              setPageCount(pdf.getPageCount());
            } catch {
              setPageCount(null);
            }
          }}
        />

        <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          Use comma to create separate split files. Example: <strong>1-4,5-8</strong> creates two PDFs.
        </p>

        <PdfPreview file={file} maxPages={8} />

        <div className="space-y-2 rounded-xl border bg-white p-4">
          <label className="text-sm font-medium text-slate-700">Split groups</label>
          <input
            value={groupsInput}
            onChange={(event) => setGroupsInput(event.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Example: 1-4,5,6-7"
          />
          <p className="text-xs text-slate-500">Examples: 1-4 | 1-4,5-8 | 1-4,5,6-7</p>

          {parsedGroups.error ? (
            <p className="text-sm text-red-600">{parsedGroups.error}</p>
          ) : parsedGroups.groups.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Output files preview</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {parsedGroups.groups.map((group, index) => (
                  <li key={`${group.label}-${index}`}>
                    File {index + 1}: pages {group.pages.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <button onClick={runSplit} className="btn-primary" disabled={!file || Boolean(parsedGroups.error)}>
          Split into files
        </button>

        <StatusCard status={status} />
      </div>
    </ToolShell>
  );
}
