"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAnonymousId } from "@/lib/anonymous-identity";
import { getEntitlementPlan, type UserTier } from "@/lib/entitlements";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type ExportKind = "clean" | "watermarked" | "blocked";

export type EntitlementStatus = {
  identityType: "guest" | "user";
  tier: UserTier;
  dailyCleanExportLimit: number;
  cleanExportsUsed: number;
  cleanExportsRemaining: number;
  watermarkedExportsUsed: number;
  blockedExportsCount: number;
  canExportClean: boolean;
  isUnlimited: boolean;
  planLabel: string;
};

export type RecordExportResult = EntitlementStatus & {
  allowed: boolean;
  exportKind: ExportKind;
  error?: string;
};

type UseEntitlementState = {
  status: EntitlementStatus;
  loading: boolean;
  error: string | null;
};

const guestPlan = getEntitlementPlan("guest");

const DEFAULT_STATUS: EntitlementStatus = {
  identityType: "guest",
  tier: "guest",
  dailyCleanExportLimit: 1,
  cleanExportsUsed: 0,
  cleanExportsRemaining: 1,
  watermarkedExportsUsed: 0,
  blockedExportsCount: 0,
  canExportClean: true,
  isUnlimited: false,
  planLabel: guestPlan.label,
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildStatusUrl(anonymousId: string | null) {
  const params = new URLSearchParams();

  if (anonymousId) {
    params.set("anonymousId", anonymousId);
  }

  const query = params.toString();

  return query ? `/api/entitlements/status?${query}` : "/api/entitlements/status";
}

export function useEntitlement() {
  const [state, setState] = useState<UseEntitlementState>({
    status: DEFAULT_STATUS,
    loading: true,
    error: null,
  });

  const anonymousId = useMemo(() => getAnonymousId(), []);

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(buildStatusUrl(anonymousId), {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const payload = await parseJsonResponse<EntitlementStatus>(response);

      if (!response.ok || !payload) {
        throw new Error("Unable to load entitlement status.");
      }

      setState({
        status: payload,
        loading: false,
        error: null,
      });

      return payload;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load entitlement status.";

      setState((current) => ({
        ...current,
        loading: false,
        error: message,
      }));

      return null;
    }
  }, [anonymousId]);

  const recordExport = useCallback(
    async ({
      toolKey,
      exportKind = "clean",
    }: {
      toolKey: string;
      exportKind?: ExportKind;
    }): Promise<RecordExportResult> => {
      try {
        const response = await fetch("/api/entitlements/record-export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          credentials: "include",
          body: JSON.stringify({
            anonymousId,
            toolKey,
            exportKind,
          }),
        });

        const payload = await parseJsonResponse<RecordExportResult>(response);

        if (!payload) {
          throw new Error("Unable to record export usage.");
        }

        setState((current) => ({
          ...current,
          status: {
            identityType: payload.identityType,
            tier: payload.tier,
            dailyCleanExportLimit: payload.dailyCleanExportLimit,
            cleanExportsUsed: payload.cleanExportsUsed,
            cleanExportsRemaining: payload.cleanExportsRemaining,
            watermarkedExportsUsed: payload.watermarkedExportsUsed,
            blockedExportsCount: payload.blockedExportsCount,
            canExportClean: payload.canExportClean,
            isUnlimited: payload.isUnlimited,
            planLabel: payload.planLabel,
          },
          error: payload.error ?? null,
        }));

        return payload;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to record export usage.";

        setState((current) => ({
          ...current,
          error: message,
        }));

        return {
          ...state.status,
          allowed: false,
          exportKind: "blocked",
          error: message,
        };
      }
    },
    [anonymousId, state.status],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } =
      supabase?.auth.onAuthStateChange(() => {
        void refresh();
      }) ?? { data: { subscription: null } };

    function handleFocus() {
      void refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    ...state.status,
    loading: state.loading,
    error: state.error,
    refresh,
    recordExport,
  };
}
