"use client";

import {
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileClock,
  FilePlus2,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  formatBytes,
  type WorkspaceDocument,
  type WorkspaceQuota,
  type WorkspaceUsage,
  type WorkspaceVersion,
} from "@/lib/workspace";
import { uploadWorkspacePdf } from "@/lib/workspace/client";

type WorkspacePayload = {
  ok: true;
  tier: string;
  quota: WorkspaceQuota;
  usage: WorkspaceUsage;
  documents: WorkspaceDocument[];
};

const EMPTY_USAGE: WorkspaceUsage = { documentCount: 0, versionCount: 0, storageBytes: 0 };

async function workspaceFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.error ?? "Workspace request failed.");
  return body;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DocumentWorkspaceClient({ displayName }: { displayName: string }) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [quota, setQuota] = useState<WorkspaceQuota | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsage>(EMPTY_USAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const newDocumentInput = useRef<HTMLInputElement>(null);
  const newVersionInput = useRef<HTMLInputElement>(null);

  const selected = documents.find((document) => document.id === selectedId) ?? documents[0] ?? null;

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await workspaceFetch<WorkspacePayload>("/api/workspace/documents");
      setDocuments(payload.documents);
      setQuota(payload.quota);
      setUsage(payload.usage);
      setSelectedId((current) =>
        current && payload.documents.some((document) => document.id === current)
          ? current
          : payload.documents[0]?.id ?? null,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load the workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  async function handleUpload(file: File, document?: WorkspaceDocument) {
    setBusy(document ? `version:${document.id}` : "new-document");
    setError(null);
    setNotice(null);
    try {
      await uploadWorkspacePdf({
        file,
        documentId: document?.id,
        title: document?.title ?? file.name.replace(/\.pdf$/i, ""),
        label: document ? `Uploaded ${new Date().toLocaleDateString()}` : "Original",
        kind: document ? "processed" : "original",
      });
      setNotice(document ? "New version saved." : "Document saved to your private workspace.");
      await loadWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setBusy(null);
      if (newDocumentInput.current) newDocumentInput.current.value = "";
      if (newVersionInput.current) newVersionInput.current.value = "";
    }
  }

  async function renameDocument(document: WorkspaceDocument) {
    const title = editingTitle.trim();
    if (!title) return;
    setBusy(`rename:${document.id}`);
    setError(null);
    try {
      await workspaceFetch(`/api/workspace/documents/${document.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setEditingId(null);
      setNotice("Document renamed.");
      await loadWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Rename failed.");
    } finally {
      setBusy(null);
    }
  }

  async function restoreVersion(document: WorkspaceDocument, version: WorkspaceVersion) {
    setBusy(`restore:${version.id}`);
    setError(null);
    try {
      await workspaceFetch(`/api/workspace/documents/${document.id}/versions/${version.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      setNotice(`Version ${version.versionNumber} is now current.`);
      await loadWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadVersion(version: WorkspaceVersion) {
    setBusy(`download:${version.id}`);
    setError(null);
    try {
      const payload = await workspaceFetch<{ ok: true; url: string }>(
        `/api/workspace/versions/${version.id}/download`,
      );
      window.location.assign(payload.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDocument(document: WorkspaceDocument) {
    if (!window.confirm(`Permanently delete “${document.title}” and all of its versions?`)) return;
    setBusy(`delete:${document.id}`);
    setError(null);
    try {
      await workspaceFetch(`/api/workspace/documents/${document.id}`, { method: "DELETE" });
      setNotice("Document and all stored versions deleted.");
      await loadWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteVersion(document: WorkspaceDocument, version: WorkspaceVersion) {
    if (!window.confirm(`Permanently delete version ${version.versionNumber}?`)) return;
    setBusy(`delete-version:${version.id}`);
    setError(null);
    try {
      await workspaceFetch(`/api/workspace/documents/${document.id}/versions/${version.id}`, {
        method: "DELETE",
      });
      setNotice(`Version ${version.versionNumber} deleted.`);
      await loadWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Version deletion failed.");
    } finally {
      setBusy(null);
    }
  }

  const storagePercent = quota
    ? Math.min(100, Math.round((usage.storageBytes / quota.maximumStorageBytes) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <section className="border-b border-[var(--border-light)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-9 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="section-eyebrow">Private document workspace</p>
            <h1 className="display-font mt-2 text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
              {displayName}&apos;s documents
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Store PDFs privately, keep durable versions, restore an earlier version, and download any saved copy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={newDocumentInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={Boolean(busy)}
              onClick={() => newDocumentInput.current?.click()}
            >
              {busy === "new-document" ? <LoaderCircle size={17} className="animate-spin" /> : <UploadCloud size={17} />}
              Upload PDF
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error ? <X size={18} /> : <Check size={18} />}
            <span>{error ?? notice}</span>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Documents</div>
            <div className="mt-1 text-2xl font-bold">{usage.documentCount}{quota ? ` / ${quota.maximumDocuments}` : ""}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Versions</div>
            <div className="mt-1 text-2xl font-bold">{usage.versionCount}{quota ? ` / ${quota.maximumVersions}` : ""}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <span>Private storage</span><span>{storagePercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-panel)]">
              <div className="h-full rounded-full bg-[var(--violet-600)]" style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
              {formatBytes(usage.storageBytes)}{quota ? ` of ${formatBytes(quota.maximumStorageBytes)}` : ""}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[var(--border-light)] bg-white">
            <LoaderCircle className="animate-spin text-[var(--violet-600)]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--violet-border)] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
              <FilePlus2 size={25} />
            </div>
            <h2 className="display-font mt-5 text-2xl font-bold">Your workspace is ready</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              Upload your first PDF. File bytes stay in a private bucket and are never exposed through a public URL.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)]">
            <div className="space-y-3" aria-label="Saved documents">
              {documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedId(document.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.id === document.id
                      ? "border-[var(--violet-border)] bg-[var(--violet-50)] shadow-sm"
                      : "border-[var(--border-light)] bg-white hover:border-[var(--border-focus)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 shrink-0 text-[var(--violet-600)]" size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{document.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {document.versions.length} {document.versions.length === 1 ? "version" : "versions"} · {formatBytes(document.sizeBytes)}
                      </div>
                    </div>
                    <ChevronDown size={17} className="mt-1 -rotate-90 text-[var(--text-muted)]" />
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <article className="rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {editingId === selected.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          maxLength={120}
                          autoFocus
                          className="min-w-0 flex-1 rounded-xl border border-[var(--border-focus)] px-3 py-2 font-bold outline-none ring-2 ring-[var(--violet-100)]"
                        />
                        <button type="button" className="rounded-xl bg-[var(--violet-600)] p-2 text-white" onClick={() => void renameDocument(selected)} aria-label="Save document name"><Check size={18} /></button>
                        <button type="button" className="rounded-xl border border-[var(--border-light)] p-2" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="display-font truncate text-2xl font-bold">{selected.title}</h2>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-panel)]"
                          onClick={() => { setEditingId(selected.id); setEditingTitle(selected.title); }}
                          aria-label="Rename document"
                        ><Pencil size={16} /></button>
                      </div>
                    )}
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {selected.originalFileName} · {selected.pageCount ?? "Unknown"} pages · Updated {formatDate(selected.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={newVersionInput}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(file, selected);
                      }}
                    />
                    <button type="button" className="btn-secondary px-4 py-2.5" disabled={Boolean(busy)} onClick={() => newVersionInput.current?.click()}>
                      {busy === `version:${selected.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Add version
                    </button>
                    <button type="button" className="rounded-full border border-red-200 p-2.5 text-red-700 hover:bg-red-50" disabled={Boolean(busy)} onClick={() => void deleteDocument(selected)} aria-label="Delete document">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
                  <FileClock size={18} className="text-[var(--violet-600)]" />
                  <h3 className="font-bold">Version history</h3>
                </div>

                <div className="divide-y divide-[var(--border-light)]">
                  {selected.versions.map((version) => (
                    <div key={version.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-panel)] text-[var(--violet-600)]">
                          <Clock3 size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">Version {version.versionNumber}</span>
                            {version.isLatest && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Current</span>}
                            {version.uploadStatus !== "ready" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">{version.uploadStatus}</span>}
                          </div>
                          <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                            {version.label ?? version.kind} · {formatBytes(version.sizeBytes)} · {formatDate(version.createdAt)}
                          </div>
                        </div>
                      </div>
                      {version.uploadStatus === "ready" && (
                        <div className="flex gap-2 pl-12 sm:pl-0">
                          {!version.isLatest && (
                            <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] px-3 py-2 text-xs font-bold hover:bg-[var(--bg-panel)]" disabled={Boolean(busy)} onClick={() => void restoreVersion(selected, version)}>
                              {busy === `restore:${version.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore
                            </button>
                          )}
                          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] px-3 py-2 text-xs font-bold hover:bg-[var(--bg-panel)]" disabled={Boolean(busy)} onClick={() => void downloadVersion(version)}>
                            {busy === `download:${version.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Download
                          </button>
                          {!version.isLatest && (
                            <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" disabled={Boolean(busy)} onClick={() => void deleteVersion(selected, version)} aria-label={`Delete version ${version.versionNumber}`}>
                              {busy === `delete-version:${version.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-secondary)]">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--violet-600)]" />
                  <span>Downloads use short-lived signed links. Restoring changes the current pointer without deleting later versions.</span>
                </div>
              </article>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
