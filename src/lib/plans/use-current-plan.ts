"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  invalidatePlanSnapshot,
  loadPlanSnapshot,
  LOCAL_SNAPSHOT,
  peekPlanSnapshot,
  SIGNED_OUT_SNAPSHOT,
  subscribePlanSnapshot,
  type PlanSnapshot,
} from "./plan-store";

export interface CurrentPlanState extends PlanSnapshot {
  loading: boolean;
}

/**
 * The plan for this device, shared by every screen. It resolves from the
 * network when possible and from the local cache without signal.
 */
export function useCurrentPlan(): CurrentPlanState {
  const [state, setState] = useState<CurrentPlanState>(() => {
    const known = peekPlanSnapshot();
    if (known) return { ...known, loading: false };
    const configured = Boolean(createClient());
    return { ...(configured ? SIGNED_OUT_SNAPSHOT : LOCAL_SNAPSHOT), loading: configured };
  });

  useEffect(() => {
    let alive = true;
    let revision = 0;
    const refresh = (force: boolean): void => {
      const current = ++revision;
      void loadPlanSnapshot(force).then((snapshot) => {
        if (alive && current === revision) setState({ ...snapshot, loading: false });
      });
    };
    const unsubscribe = subscribePlanSnapshot(() => refresh(false));
    refresh(false);

    const onOnline = (): void => refresh(true);
    window.addEventListener("online", onOnline);

    const client = createClient();
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // Supabase warns against calling its API inside this callback.
      window.setTimeout(invalidatePlanSnapshot, 0);
    });

    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener("online", onOnline);
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
