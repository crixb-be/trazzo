"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeeded, type FeeQuote, type Project, type Takeoff } from "./db";
import { getStudioProfile } from "./profile";
import type { StudioProfile } from "./db";
import { getSyncStatus, startOnlineSync, type SyncStatus } from "./sync";

export function useCards() {
  const cards = useLiveQuery(async () => (db ? db.rneCards.toArray() : []), [], []);
  useEffect(() => {
    void ensureSeeded();
  }, []);
  return cards;
}

export function useCard(slug: string) {
  return useLiveQuery(async () => (slug && db ? db.rneCards.get(slug) : undefined), [slug]);
}

export function useMaterials() {
  return useLiveQuery(async () => (db ? db.materials.toArray() : []), [], []) ?? [];
}

export function useProjects(): Project[] {
  return (
    useLiveQuery(
      async () => (db ? db.projects.orderBy("updatedAt").reverse().toArray() : []),
      [],
      [],
    ) ?? []
  );
}

export function useTakeoffs(projectId: string): Takeoff[] {
  return (
    useLiveQuery(
      async () =>
        projectId && db ? db.takeoffs.where("projectId").equals(projectId).toArray() : [],
      [projectId],
      [],
    ) ?? []
  );
}

export function useSyncStatus(): SyncStatus {
  // The initial value must match the server render (no navigator there) to avoid
  // hydration mismatches; the live query replaces it right after mount.
  const status = useLiveQuery(() => getSyncStatus(), [], {
    online: true,
    configured: false,
    syncing: false,
    pending: 0,
    lastSync: null,
    error: null,
  });

  useEffect(() => startOnlineSync(), []);
  return status;
}

export function useOnlineStatus(): boolean {
  const online = useLiveQuery(
    async () => (typeof navigator !== "undefined" ? navigator.onLine : false),
    [],
    true,
  );

  useEffect(() => {
    const update = (): void => {
      void db?.meta.put({
        key: "online:" + Date.now(),
        value: navigator.onLine ? "true" : "false",
      });
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

export function useSeeded(): boolean {
  return useCards().length > 0;
}

export function useFeeQuotes(): FeeQuote[] {
  return (
    useLiveQuery(
      async () => (db ? db.fee_quotes.orderBy("updatedAt").reverse().toArray() : []),
      [],
      [],
    ) ?? []
  );
}

export function useStudioProfile(): StudioProfile {
  return useLiveQuery(() => getStudioProfile(), [], {
    id: "default",
    fullName: "",
    capNumber: "",
    studioName: "",
    ruc: "",
    address: "",
    brandPrimary: "#13294B",
    brandSecondary: "#C59B27",
    logoDataUrl: null,
    updatedAt: "",
  });
}

export function useProfessionalProfile(): { fullName: string; capNumber: string } {
  const profile = useStudioProfile();
  return { fullName: profile.fullName, capNumber: profile.capNumber };
}
