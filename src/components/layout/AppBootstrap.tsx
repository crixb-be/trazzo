"use client";

import { useEffect } from "react";
import { db, ensureSeeded } from "@/lib/offline/db";
import { startOnlineSync, syncNow } from "@/lib/offline/sync";

export function AppBootstrap() {
  useEffect(() => {
    void ensureSeeded().then(() => {
      // Older versions wrote one row per connection change; clear them once.
      void db?.meta.where("key").startsWith("online:").delete();
      if (typeof navigator !== "undefined" && navigator.onLine) void syncNow();
    });

    return startOnlineSync();
  }, []);

  return null;
}
