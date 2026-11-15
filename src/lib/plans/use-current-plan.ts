"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  invalidatePlanSnapshot,
  loadPlanSnapshot,
  LOCAL_SNAPSHOT,
  peekPlanSnapshot,
  SIGNED_OUT_SNAPSHOT,
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
    const refresh = (force: boolean): void => {
      void loadPlanSnapshot(force).then((snapshot) => {
        if (alive) setState({ ...snapshot, loading: false });
      });
    };
    refresh(false);

    const onOnline = (): void => refresh(true);
    window.addEventListener("online", onOnline);

    const client = createClient();
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      invalidatePlanSnapshot();
      // Supabase warns against calling its API inside this callback.
      window.setTimeout(() => refresh(true), 0);
    });

    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
