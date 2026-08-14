"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Header } from "@/components/Header";

type ProfileTier = "free" | "plus" | "pro" | "admin";
type ViewMode = "overview" | "users" | "operations" | "controls";

type AdminProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: ProfileTier;
  tier_expires_at: string | null;
  daily_export_limit: number;
  created_at: string;
  updated_at: string;
};

type AdminPayload = {
  ok: true;
  generatedAt: string;
  admin: { userId: string; email: string | null };
  overview: {
    profiles: number;
    tierCounts: Record<ProfileTier, number>;
    activeSubscriptions: number;
    usageToday: {
      cleanExports: number;
      watermarkedExports: number;
      blockedExports: number;
    };
    activeIdentitiesToday: number;
    runningJobs: number;
    failedJobs: number;
    recentFailedToolRuns: number;
  };
  backend: {
    configured: boolean;
    checks: Record<string, boolean>;
    capabilities: Array<{
      key: string;
      label: string;
      enabled: boolean;
      reason: string;
    }>;
  };
  conversions: Array<{
    conversionId: string;
    enabled: boolean;
    hidden: boolean;
    beta: boolean;
    status: string;
    access: string;
    dailyLimit: number | null;
    batchLimit: number;
    capabilityKey: string;
  }>;
  profiles: AdminProfile[];
  recentJobs: Array<{
    status: string;
    job_type: string;
    created_at: string;
    completed_at: string | null;
  }>;
  recentToolRuns: Array<{
    tool_key: string;
    status: string;
    execution_mode: string;
    duration_ms: number | null;
    created_at: string;
  }>;
};

type ProfileDraft = {
  tier: ProfileTier;
  tierExpiresAt: string;
  dailyExportLimit: string;
};

const TIERS: readonly ProfileTier[] = ["free", "plus", "pro", "admin"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function createDraft(profile: AdminProfile): ProfileDraft {
  return {
    tier: profile.tier,
    tierExpiresAt: toDateInput(profile.tier_expires_at),
    dailyExportLimit: String(profile.daily_export_limit),
  };
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-500">{note}</div>
    </div>
  );
}

function Status({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black",
        good
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {good ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {children}
    </span>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
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

export default function AdminPage() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<ViewMode>("overview");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ProfileDraft>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));

      const payload = (await response.json()) as AdminPayload;
      if (!payload.ok) throw new Error("Administrator payload is invalid.");

      setData(payload);
      setDrafts(
        Object.fromEntries(
          payload.profiles.map((profile) => [profile.id, createDraft(profile)]),
        ),
      );
      if (refresh) setNotice("Administration data refreshed.");
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load administrator data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProfiles = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    if (!query) return data.profiles;

    return data.profiles.filter((profile) =>
      [profile.email, profile.display_name, profile.id, profile.tier]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [data, search]);

  function updateDraft(userId: string, patch: Partial<ProfileDraft>) {
    setDrafts((current) => {
      const existing = current[userId];
      if (!existing) return current;
      return { ...current, [userId]: { ...existing, ...patch } };
    });
  }

  async function saveProfile(profile: AdminProfile) {
    const draft = drafts[profile.id];
    if (!draft || savingUserId) return;

    const dailyLimit = Number(draft.dailyExportLimit);
    if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 999999) {
      setNotice("Daily export limit must be a whole number from 0 to 999999.");
      return;
    }

    setSavingUserId(profile.id);
    setNotice("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          tier: draft.tier,
          tierExpiresAt: draft.tierExpiresAt
            ? new Date(`${draft.tierExpiresAt}T23:59:59.999Z`).toISOString()
            : null,
          dailyExportLimit: dailyLimit,
        }),
      });

      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as {
        ok: boolean;
        profile?: AdminProfile;
      };
      if (!payload.ok || !payload.profile) {
        throw new Error("Administrator update did not return a profile.");
      }

      const updated = payload.profile;
      setData((current) =>
        current
          ? {
              ...current,
              profiles: current.profiles.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : null,
      );
      setDrafts((current) => ({
        ...current,
        [updated.id]: createDraft(updated),
      }));
      setNotice(`Updated ${updated.email || updated.id}.`);
    } catch (saveError) {
      setNotice(
        saveError instanceof Error ? saveError.message : "Unable to update user.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                <ShieldCheck size={14} />
                Administrator control plane
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                PDFMantra Administration
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Secure operational visibility and entitlement administration for
                users, exports, jobs, backend capabilities, and conversions.
              </p>
            </div>

            <button
              type="button"
              disabled={loading || refreshing}
              onClick={() => void load(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-6">
              <Panel>
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto animate-spin text-violet-600" size={28} />
                    <div className="mt-3 text-sm font-black text-slate-600">
                      Loading administrator data...
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <AlertTriangle className="mx-auto text-red-600" size={30} />
              <div className="mt-3 text-lg font-black text-slate-950">
                Administration unavailable
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-500">{error}</div>
            </div>
          ) : data ? (
            <>
              <div className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                {(
                  [
                    ["overview", "Overview", Activity],
                    ["users", "Users & entitlements", Users],
                    ["operations", "Operations", Database],
                    ["controls", "Tool controls", Wrench],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={[
                      "flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition",
                      view === id
                        ? "bg-violet-600 text-white"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700",
                    ].join(" ")}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {notice ? (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                  {notice}
                </div>
              ) : null}

              {view === "overview" ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <Metric label="Users" value={data.overview.profiles} note={`${data.overview.tierCounts.pro} Pro · ${data.overview.tierCounts.admin} Admin`} />
                    <Metric label="Subscriptions" value={data.overview.activeSubscriptions} note="Active or trialing" />
                    <Metric label="Clean exports" value={data.overview.usageToday.cleanExports} note={`${data.overview.activeIdentitiesToday} identities today`} />
                    <Metric label="Blocked exports" value={data.overview.usageToday.blockedExports} note="Entitlement blocks today" />
                    <Metric label="Running jobs" value={data.overview.runningJobs} note={`${data.overview.failedJobs} failed in sample`} />
                    <Metric label="Failed tool runs" value={data.overview.recentFailedToolRuns} note="Recent operational sample" />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <Panel>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-950">Backend health</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">Configuration readiness</div>
                        </div>
                        <Status good={data.backend.configured}>
                          {data.backend.configured ? "Configured" : "Attention"}
                        </Status>
                      </div>
                      <div className="mt-4 space-y-2">
                        {Object.entries(data.backend.checks).map(([key, ready]) => (
                          <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span className="text-xs font-bold text-slate-600">{key}</span>
                            <Status good={ready}>{ready ? "Ready" : "Missing"}</Status>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel>
                      <div className="text-sm font-black text-slate-950">Backend capabilities</div>
                      <div className="mt-3 space-y-2">
                        {data.backend.capabilities.map((capability) => (
                          <div key={capability.key} className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black text-slate-700">{capability.label}</span>
                              <Status good={capability.enabled}>{capability.enabled ? "Ready" : "Off"}</Status>
                            </div>
                            <div className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{capability.reason}</div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>
                </div>
              ) : null}

              {view === "users" ? (
                <div className="mt-5">
                  <Panel>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-950">Users & entitlements</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          Change tier, expiry and daily clean-export allowance. Your own admin tier is protected.
                        </div>
                      </div>
                      <label className="relative block sm:w-80">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search user"
                          className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[940px] border-separate border-spacing-y-2 text-left">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            <th className="px-3">User</th>
                            <th className="px-3">Tier</th>
                            <th className="px-3">Expiry</th>
                            <th className="px-3">Daily exports</th>
                            <th className="px-3">Updated</th>
                            <th className="px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProfiles.map((profile) => {
                            const draft = drafts[profile.id] || createDraft(profile);
                            const self = profile.id === data.admin.userId;
                            return (
                              <tr key={profile.id} className="bg-slate-50">
                                <td className="rounded-l-xl px-3 py-3">
                                  <div className="text-xs font-black text-slate-800">
                                    {profile.display_name || profile.email || "Unnamed user"}
                                  </div>
                                  <div className="mt-1 max-w-[260px] truncate text-[10px] font-semibold text-slate-500">
                                    {profile.email || profile.id}{self ? " · You" : ""}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <select
                                    value={draft.tier}
                                    disabled={self}
                                    onChange={(event) => updateDraft(profile.id, { tier: event.target.value as ProfileTier })}
                                    className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black disabled:opacity-60"
                                  >
                                    {TIERS.map((tier) => <option key={tier} value={tier}>{tier.toUpperCase()}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="date"
                                    value={self ? "" : draft.tierExpiresAt}
                                    disabled={self}
                                    onChange={(event) => updateDraft(profile.id, { tierExpiresAt: event.target.value })}
                                    className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold disabled:opacity-60"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={999999}
                                    value={draft.dailyExportLimit}
                                    onChange={(event) => updateDraft(profile.id, { dailyExportLimit: event.target.value })}
                                    className="h-9 w-32 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                                  />
                                </td>
                                <td className="px-3 py-3 text-[10px] font-semibold text-slate-500">
                                  {formatDate(profile.updated_at)}
                                </td>
                                <td className="rounded-r-xl px-3 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={Boolean(savingUserId)}
                                    onClick={() => void saveProfile(profile)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-black text-white disabled:opacity-50"
                                  >
                                    {savingUserId === profile.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    Save
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {!filteredProfiles.length ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                          No matching users.
                        </div>
                      ) : null}
                    </div>
                  </Panel>
                </div>
              ) : null}

              {view === "operations" ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <Panel>
                    <div className="text-sm font-black text-slate-950">Recent processing jobs</div>
                    <div className="mt-3 space-y-2">
                      {data.recentJobs.length ? data.recentJobs.map((job, index) => (
                        <div key={`${job.job_type}-${job.created_at}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                          <div>
                            <div className="text-xs font-black text-slate-700">{job.job_type}</div>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">{formatDate(job.created_at)}</div>
                          </div>
                          <Status good={job.status === "completed"}>{job.status}</Status>
                        </div>
                      )) : <div className="py-8 text-center text-sm font-bold text-slate-500">No recent jobs.</div>}
                    </div>
                  </Panel>

                  <Panel>
                    <div className="text-sm font-black text-slate-950">Recent tool runs</div>
                    <div className="mt-3 space-y-2">
                      {data.recentToolRuns.length ? data.recentToolRuns.map((run, index) => (
                        <div key={`${run.tool_key}-${run.created_at}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                          <div>
                            <div className="text-xs font-black text-slate-700">{run.tool_key}</div>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">{run.execution_mode} · {run.duration_ms ?? "—"} ms · {formatDate(run.created_at)}</div>
                          </div>
                          <Status good={run.status === "completed"}>{run.status}</Status>
                        </div>
                      )) : <div className="py-8 text-center text-sm font-bold text-slate-500">No recent tool runs.</div>}
                    </div>
                  </Panel>
                </div>
              ) : null}

              {view === "controls" ? (
                <div className="mt-5">
                  <Panel>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-950">Conversion control registry</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          Runtime view of enablement, visibility, access and limits. Deployment overrides remain server-managed.
                        </div>
                      </div>
                      <Status good={data.backend.configured}>
                        {data.conversions.filter((item) => item.enabled).length} enabled
                      </Status>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            <th className="px-3 py-2">Conversion</th>
                            <th className="px-3 py-2">State</th>
                            <th className="px-3 py-2">Access</th>
                            <th className="px-3 py-2">Daily</th>
                            <th className="px-3 py-2">Batch</th>
                            <th className="px-3 py-2">Capability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.conversions.map((control) => (
                            <tr key={control.conversionId} className="border-b border-slate-100">
                              <td className="px-3 py-3 font-black text-slate-700">{control.conversionId}{control.beta ? " · Beta" : ""}</td>
                              <td className="px-3 py-3"><Status good={control.enabled && !control.hidden}>{control.hidden ? "hidden" : control.status}</Status></td>
                              <td className="px-3 py-3 font-bold text-slate-600">{control.access}</td>
                              <td className="px-3 py-3 font-bold text-slate-600">{control.dailyLimit ?? "∞"}</td>
                              <td className="px-3 py-3 font-bold text-slate-600">{control.batchLimit}</td>
                              <td className="px-3 py-3 font-semibold text-slate-500">{control.capabilityKey}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </div>
              ) : null}

              <div className="mt-4 text-right text-[10px] font-bold text-slate-400">
                Snapshot generated {formatDate(data.generatedAt)}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}
