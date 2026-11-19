"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeeded, type FeeQuote, type Project, type Takeoff } from "./db";
import { getStudioProfile } from "./profile";
import type { StudioProfile } from "./db";
import {
  getInitialSyncActivity,
  getSyncActivity,
  getSyncStatus,
  subscribeSyncActivity,
  type SyncStatus,
} from "./sync";

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

/** Projects, or `undefined` while IndexedDB is still being read (not the same as none). */
export function useProjectList(): Project[] | undefined {
  return useLiveQuery(async () => (db ? db.projects.orderBy("updatedAt").reverse().toArray() : []));
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
    configured: false,
    pending: 0,
    lastSync: null,
    error: null,
  });
  const online = useOnlineStatus();
  const activity = useSyncExternalStore(
    subscribeSyncActivity,
    getSyncActivity,
    getInitialSyncActivity,
  );
  return { ...status, ...activity, online };
}

function subscribeToConnection(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Connection state straight from the browser events; nothing is written to the database. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );
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
    avatarDataUrl: null,
    updatedAt: "",
  });
}

export function useProfessionalProfile(): { fullName: string; capNumber: string } {
  const profile = useStudioProfile();
  return { fullName: profile.fullName, capNumber: profile.capNumber };
}
