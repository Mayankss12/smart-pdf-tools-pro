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
import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";

type UserTier = "free" | "plus" | "pro" | "admin";

type AdminProfile = {
  readonly id: string;
  readonly email: string | null;
  readonly display_name: string | null;
  readonly tier: UserTier;
  readonly tier_expires_at: string | null;
  readonly daily_export_limit: number;
  readonly created_at: string;
  readonly updated_at: string;
};

type AdminOverview = {
  readonly profiles: number;
  readonly tierCounts: Record<UserTier, number>;
  readonly activeSubscriptions: number;
  readonly usageToday: {
    readonly cleanExports: number;
    readonly watermarkedExports: number;
    readonly blockedExports: number;
  };
  readonly activeIdentitiesToday: number;
  readonly runningJobs: number;
  readonly failedJobs: number;
  readonly recentFailedToolRuns: number;
};

type ConversionControl = {
  readonly conversionId: string;
  readonly enabled: boolean;
  readonly hidden: boolean;
  readonly beta: boolean;
  readonly status: string;
  readonly access: string;
  readonly dailyLimit: number | null;
  readonly maxFileSize: number;
  readonly maxPageCount: number | null;
  readonly batchLimit: number;
  readonly capabilityKey: string;
  readonly disabledReason: string | null;
};

type ToolRun = {
  readonly tool_key: string;
  readonly status: string;
  readonly execution_mode: string;
  readonly duration_ms: number | null;
  readonly created_at: string;
};

type ProcessingJob = {
  readonly status: string;
  readonly job_type: string;
  readonly created_at: string;
  readonly completed_at: string | null;
};

type AdminPayload = {
  readonly ok: true;
  readonly generatedAt: string;
  readonly admin: {
    readonly userId: string;
    readonly email: string | null;
  };
  readonly overview: AdminOverview;
  readonly backend: {
    readonly configured: boolean;
    readonly checks: Record<string, boolean>;
    readonly capabilities: Record<string, boolean>;
    readonly storageBuckets: readonly string[];
  };
  readonly conversions: readonly ConversionControl[];
  readonly profiles: readonly AdminProfile[];
  readonly recentJobs: readonly ProcessingJob[];
  readonly recentToolRuns: readonly ToolRun[];
};

type AdminErrorPayload = {
  readonly ok: false;
  readonly error: string;
};

type ProfileDraft = {
  readonly tier: UserTier;
  readonly tierExpiresAt: string;
  readonly dailyExportLimit: string;
};

type ViewMode = "overview" | "users" | "operations" | "controls";

const TIER_OPTIONS: readonly UserTier[] = ["free", "plus", "pro", "admin"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function createDraft(profile: AdminProfile): ProfileDraft {
  return {
    tier: profile.tier,
    tierExpiresAt: toDateInput(profile.tier_expires_at),
    dailyExportLimit: String(profile.daily_export_limit),
  };
}

function StatusPill({ good, children }: { readonly good: boolean; readonly children: React.ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black",
        good
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {good ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-500">{detail}</div>
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-bold text-slate-500">
      {message}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<ViewMode>("overview");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ProfileDraft>>({});

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
      });
      const payload = (await response.json()) as AdminPayload | AdminErrorPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Unable to load administrator data." : payload.error);
      }

      setData(payload);
      setDrafts(
        Object.fromEntries(
          payload.profiles.map((profile) => [profile.id, createDraft(profile)]),
        ),
      );
      setNotice(quiet ? "Administration data refreshed." : "");
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
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [data, search]);

  function updateDraft(userId: string, next: Partial<ProfileDraft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {
          tier: "free" as const,
          tierExpiresAt: "",
          dailyExportLimit: "5",
        }),
        ...next,
      },
    }));
  }

  async function saveProfile(profile: AdminProfile) {
    const draft = drafts[profile.id];
    if (!draft || savingUserId) return;

    const parsedLimit = Number(draft.dailyExportLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 0 || parsedLimit > 999999) {
      setNotice("Daily export limit must be a whole number between 0 and 999999.");
      return;
    }

    setSavingUserId(profile.id);
    setNotice("");

    try {
      const response = await fetch("/api/admin/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          tier: draft.tier,
          tierExpiresAt: draft.tierExpiresAt
            ? new Date(`${draft.tierExpiresAt}T23:59:59.999Z`).toISOString()
            : null,
          dailyExportLimit: parsedLimit,
        }),
      });
      const payload = (await response.json()) as
        | { readonly ok: true; readonly profile: AdminProfile }
        | AdminErrorPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Update failed." : payload.error);
      }

      setData((current) =>
        current
          ? {
              ...current,
              profiles: current.profiles.map((item) =>
                item.id === payload.profile.id ? payload.profile : item,
              ),
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [payload.profile.id]: createDraft(payload.profile),
      }));
      setNotice(`Updated ${payload.profile.email ?? payload.profile.id}.`);
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
              <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">
                PDFMantra Administration
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Runtime visibility for users, entitlements, usage, backend health,
                processing jobs, and conversion controls. Sensitive changes are
                validated again on the server.
              </p>
            </div>

            <button
              type="button"
              disabled={refreshing || loading}
              onClick={() => void load(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-violet-600" size={30} />
                <div className="mt-3 text-sm font-black text-slate-600">
                  Loading administrator data...
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mt-8 rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <AlertTriangle className="mx-auto text-red-600" size={32} />
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
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700",
                    ].join(" ")}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {notice ? (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                  {notice}
                </div>
              ) : null}

              {view === "overview" ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    <MetricCard
                      label="Users"
                      value={data.overview.profiles}
                      detail={`${data.overview.tierCounts.pro} Pro · ${data.overview.tierCounts.admin} Admin`}
                    />
                    <MetricCard
                      label="Active subscriptions"
                      value={data.overview.activeSubscriptions}
                      detail="Active or trialing"
                    />
                    <MetricCard
                      label="Clean exports today"
                      value={data.overview.usageToday.cleanExports}
                      detail={`${data.overview.activeIdentitiesToday} active identities`}
                    />
                    <MetricCard
                      label="Blocked exports"
                      value={data.overview.usageToday.blockedExports}
                      detail="Daily entitlement blocks"
                    />
                    <MetricCard
                      label="Running jobs"
                      value={data.overview.runningJobs}
                      detail={`${data.overview.failedJobs} recent failed`}
                    />
                    <MetricCard
                      label="Failed tool runs"
                      value={data.overview.recentFailedToolRuns}
                      detail="Recent operational sample"
                    />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-950">Backend health</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            Server configuration and runtime capabilities
                          </div>
                        </div>
                        <StatusPill good={data.backend.configured}>
                          {data.backend.configured ? "Configured" : "Needs attention"}
                        </StatusPill>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {Object.entries(data.backend.checks).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <span className="text-xs font-bold text-slate-600">{key}</span>
                            <StatusPill good={value}>{value ? "Ready" : "Missing"}</StatusPill>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-sm font-black text-slate-950">Entitlement distribution</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        Current profile tiers in the first 100 administrator-visible profiles
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {TIER_OPTIONS.map((tier) => (
                          <div key={tier} className="rounded-xl bg-slate-50 p-3 text-center">
                            <div className="text-xl font-black text-slate-950">
                              {data.overview.tierCounts[tier] ?? 0}
                            </div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                              {tier}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {view === "users" ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-950">Users & entitlements</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        Change tier, expiry and daily clean-export allowance. Your own admin tier is protected.
                      </div>
                    </div>
                    <label className="relative block sm:w-80">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search email, name, ID or tier"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                          <th className="px-3">User</th>
                          <th className="px-3">Tier</th>
                          <th className="px-3">Expires</th>
                          <th className="px-3">Daily clean exports</th>
                          <th className="px-3">Updated</th>
                          <th className="px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProfiles.map((profile) => {
                          const draft = drafts[profile.id] ?? createDraft(profile);
                          const self = profile.id === data.admin.userId;

                          return (
                            <tr key={profile.id} className="bg-slate-50 text-sm">
                              <td className="rounded-l-xl px-3 py-3">
                                <div className="font-black text-slate-800">
                                  {profile.display_name || profile.email || "Unnamed user"}
                                </div>
                                <div className="mt-0.5 max-w-[260px] truncate text-[11px] font-semibold text-slate-500">
                                  {profile.email || profile.id}
                                  {self ? " · You" : ""}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <select
                                  value={draft.tier}
                                  disabled={self}
                                  onChange={(event) =>
                                    updateDraft(profile.id, {
                                      tier: event.target.value as UserTier,
                                    })
                                  }
                                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {TIER_OPTIONS.map((tier) => (
                                    <option key={tier} value={tier}>
                                      {tier.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="date"
                                  value={self ? "" : draft.tierExpiresAt}
                                  disabled={self}
                                  onChange={(event) =>
                                    updateDraft(profile.id, {
                                      tierExpiresAt: event.target.value,
                                    })
                                  }
                                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={999999}
                                  value={draft.dailyExportLimit}
                                  onChange={(event) =>
                                    updateDraft(profile.id, {
                                      dailyExportLimit: event.target.value,
                                    })
                                  }
                                  className="h-9 w-32 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                                />
                              </td>
                              <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                                {formatDate(profile.updated_at)}
                              </td>
                              <td className="rounded-r-xl px-3 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={Boolean(savingUserId)}
                                  onClick={() => void saveProfile(profile)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingUserId === profile.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Save size={13} />
                                  )}
                                  Save
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!filteredProfiles.length ? (
                      <EmptyState message="No matching users found." />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {view === "operations" ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-black text-slate-950">Recent processing jobs</div>
                    <div className="mt-3 space-y-2">
                      {data.recentJobs.length ? (
                        data.recentJobs.map((job, index) => (
                          <div
                            key={`${job.job_type}-${job.created_at}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                          >
                            <div>
                              <div className="text-xs font-black text-slate-700">{job.job_type}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                {formatDate(job.created_at)}
                              </div>
                            </div>
                            <StatusPill good={job.status === "completed"}>
                              {job.status}
                            </StatusPill>
                          </div>
                        ))
                      ) : (
                        <EmptyState message="No recent processing jobs." />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-black text-slate-950">Recent tool runs</div>
                    <div className="mt-3 space-y-2">
                      {data.recentToolRuns.length ? (
                        data.recentToolRuns.map((run, index) => (
                          <div
                            key={`${run.tool_key}-${run.created_at}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                          >
                            <div>
                              <div className="text-xs font-black text-slate-700">{run.tool_key}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                {run.execution_mode} · {run.duration_ms ?? "—"} ms · {formatDate(run.created_at)}
                              </div>
                            </div>
                            <StatusPill good={run.status === "completed"}>
                              {run.status}
                            </StatusPill>
                          </div>
                        ))
                      ) : (
                        <EmptyState message="No recent tool runs." />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {view === "controls" ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-950">Conversion control registry</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        Runtime view of enabled, hidden, beta, access and limit settings. Deployment overrides remain server-managed.
                      </div>
                    </div>
                    <StatusPill good={data.backend.configured}>
                      {data.conversions.filter((item) => item.enabled).length} enabled
                    </StatusPill>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                          <th className="px-3 py-2">Conversion</th>
                          <th className="px-3 py-2">State</th>
                          <th className="px-3 py-2">Access</th>
                          <th className="px-3 py-2">Daily limit</th>
                          <th className="px-3 py-2">Batch</th>
                          <th className="px-3 py-2">Capability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.conversions.map((control) => (
                          <tr key={control.conversionId} className="border-b border-slate-100">
                            <td className="px-3 py-3 font-black text-slate-700">
                              {control.conversionId}
                              {control.beta ? (
                                <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700">
                                  BETA
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill good={control.enabled && !control.hidden}>
                                {control.hidden ? "hidden" : control.status}
                              </StatusPill>
                            </td>
                            <td className="px-3 py-3 font-bold text-slate-600">{control.access}</td>
                            <td className="px-3 py-3 font-bold text-slate-600">
                              {control.dailyLimit ?? "Unlimited"}
                            </td>
                            <td className="px-3 py-3 font-bold text-slate-600">{control.batchLimit}</td>
                            <td className="px-3 py-3 font-semibold text-slate-500">
                              {control.capabilityKey}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
