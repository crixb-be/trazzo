"use client";

import { useEffect, useState } from "react";
import { type Plan } from "./plans";
import { createClient } from "@/lib/supabase/client";

export interface CurrentPlanState {
  plan: Plan;
  mode: "local" | "account";
  loading: boolean;
}

export function useCurrentPlan(): CurrentPlanState {
  const configured = Boolean(createClient());
  const [state, setState] = useState<CurrentPlanState>({
    plan: "free",
    mode: configured ? "account" : "local",
    loading: configured,
  });
  useEffect(() => {
    const client = createClient();
    if (!client) {
      setState({ plan: "free", mode: "local", loading: false });
      return;
    }
    void (async () => {
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) {
        setState({ plan: "free", mode: "account", loading: false });
        return;
      }
      const { data } = await client
        .from("profiles")
        .select("plan")
        .eq("id", auth.user.id)
        .maybeSingle();
      const plan = data?.plan === "student" || data?.plan === "pro" ? data.plan : "free";
      setState({ plan, mode: "account", loading: false });
    })();
  }, []);
  return state;
}
