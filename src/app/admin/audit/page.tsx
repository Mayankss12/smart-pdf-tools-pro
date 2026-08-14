"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";

type JsonRecord = Record<string, unknown>;

type AuditRecord = {
  id: string;
  owner_id: string;
  tool_key: string;
  status: "started" | "completed" | "failed";
  execution_mode: string;
  input_summary: JsonRecord | null;
  result_summary: JsonRecord | null;
  duration_ms: number | null;
  created_at: string;
};

type AuditPayload = {
  ok: true;
  generatedAt: string;
  records: AuditRecord[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getString(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function getNestedRecord(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function summarizeChanges(record: JsonRecord | null) {
  if (!record) return "—";

  return Object.entries(record)
    .map(([key, value]) => `${key}: ${value === null ? "cleared" : String(value)}`)
    .join(" · ") || "—";
}

function StatusBadge({ status }: { readonly status: AuditRecord["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
        <CheckCircle2 size={11} /> Completed
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-700">
        <XCircle size={11} /> Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">
      <Clock3 size={11} /> Started
    </span>
  );
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export default function AdminAuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/audit", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) throw new Error(await readError(response));

      const payload = (await response.json()) as AuditPayload;
      if (!payload.ok || !Array.isArray(payload.records)) {
        throw new Error("Administrator audit payload is invalid.");
      }

      setRecords(payload.records);
    } catch (loadError) {
      setRecords([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load administrator audit records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) => {
      const input = record.input_summary;
      const target = getString(input, "target_user_id");
      const actor = getString(input, "actor_user_id") || record.owner_id;
      const requested = summarizeChanges(getNestedRecord(input, "requested_changes"));

      return [record.id, record.status, actor, target, requested]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [records, search]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                <ShieldCheck size={14} /> Administrator audit trail
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Entitlement change history
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Durable server-side records for administrator profile and entitlement changes. Mutations fail closed when the audit record cannot be created.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                <ArrowLeft size={15} /> Admin
              </Link>
              <button
                type="button"
                disabled={loading || refreshing}
                onClick={() => void load(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black">Audit records</div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  Showing the latest 100 administrator entitlement actions.
                </div>
              </div>
              <label className="relative block sm:w-96">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search actor, target, status or change"
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <Loader2 size={28} className="mx-auto animate-spin text-violet-600" />
                  <div className="mt-3 text-sm font-black text-slate-600">Loading audit records...</div>
                </div>
              </div>
            ) : error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertTriangle size={28} className="mx-auto text-red-600" />
                <div className="mt-3 text-sm font-black text-red-800">{error}</div>
              </div>
            ) : filteredRecords.length ? (
              <div className="mt-4 space-y-3">
                {filteredRecords.map((record) => {
                  const input = record.input_summary;
                  const result = record.result_summary;
                  const actor = getString(input, "actor_user_id") || record.owner_id;
                  const target = getString(input, "target_user_id") || "—";
                  const requested = getNestedRecord(input, "requested_changes");
                  const before = getNestedRecord(input, "before");
                  const after = getNestedRecord(result, "after");
                  const errorCode = getString(result, "error_code");

                  return (
                    <article key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={record.status} />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                              {formatDate(record.created_at)}
                            </span>
                            <span className="text-[10px] font-black text-slate-400">
                              {record.duration_ms ?? "—"} ms
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Actor</div>
                              <div className="mt-1 break-all font-bold text-slate-700">{actor}</div>
                            </div>
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Target</div>
                              <div className="mt-1 break-all font-bold text-slate-700">{target}</div>
                            </div>
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Audit ID</div>
                              <div className="mt-1 break-all font-bold text-slate-700">{record.id}</div>
                            </div>
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Mode</div>
                              <div className="mt-1 font-bold text-slate-700">{record.execution_mode}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Requested changes</div>
                          <div className="mt-1 text-xs font-bold leading-5 text-slate-700">{summarizeChanges(requested)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Before</div>
                          <div className="mt-1 text-xs font-bold leading-5 text-slate-700">{summarizeChanges(before)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">After / failure</div>
                          <div className="mt-1 text-xs font-bold leading-5 text-slate-700">
                            {record.status === "failed" ? errorCode || "Update failed" : summarizeChanges(after)}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
                No matching administrator audit records.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
