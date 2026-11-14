"use client";

import { useEffect } from "react";
import { ensureSeeded } from "@/lib/offline/db";
import { pullRemote, startOnlineSync } from "@/lib/offline/sync";

export function AppBootstrap() {
  useEffect(() => {
    void ensureSeeded().then(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void pullRemote().catch(() => undefined);
      }
    });

    return startOnlineSync();
  }, []);

  return null;
}
