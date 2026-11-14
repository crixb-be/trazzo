import { db, ensureSeeded, type Outbox, type Project, type Takeoff } from "./db";
import { createClient } from "@/lib/supabase/client";
import { canUseProCards, type Plan } from "@/lib/plans/plans";

export { ensureSeeded };

export interface SyncStatus {
  online: boolean;
  configured: boolean;
  syncing: boolean;
  pending: number;
  lastSync: string | null;
  error: string | null;
}

let syncInProgress = false;

async function currentPlan(): Promise<Plan> {
  const client = createClient();
  if (!client) return "free";

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return "free";

  const { data } = await client.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = data?.plan;
  return plan === "student" || plan === "pro" ? plan : "free";
}

async function writeRemoteItem(item: Outbox): Promise<void> {
  const client = createClient();
  if (!client) return;

  if (item.table === "projects") {
    if (item.op === "delete") {
      const payload = item.payload as { id: string };
      await client.from("projects").delete().eq("id", payload.id);
      return;
    }

    await client.from("projects").upsert(item.payload as Record<string, unknown>);
    return;
  }

  if (item.op === "delete") {
    const payload = item.payload as { id: string };
    await client.from("project_takeoffs").delete().eq("id", payload.id);
    return;
  }

  await client.from("project_takeoffs").upsert(item.payload as Record<string, unknown>);
}

/** Sends queued project and takeoff writes without clearing failed operations. */
export async function flushOutbox(): Promise<void> {
  if (!db || syncInProgress || !navigator.onLine) return;

  const client = createClient();
  if (!client) return;

  syncInProgress = true;
  try {
    const pending = await db.outbox.orderBy("id").toArray();
    for (const item of pending) {
      await writeRemoteItem(item);
      if (item.id !== undefined) await db.outbox.delete(item.id);
    }
    await db.meta.put({
      key: "lastSync",
      value: new Date().toISOString(),
    });
  } finally {
    syncInProgress = false;
  }
}

/**
 * Pulls public catalogue data and private projects when Supabase is configured.
 * Pro cards are requested only for an active student or Pro profile.
 */
export async function pullRemote(): Promise<void> {
  if (!db || !navigator.onLine) return;

  const client = createClient();
  if (!client) return;

  const plan = await currentPlan();
  const { data: cards } = await client
    .from("rne_cards")
    .select("*")
    .or(canUseProCards(plan) ? "is_pro.eq.false,is_pro.eq.true" : "is_pro.eq.false");
  const { data: materials } = await client.from("materials_catalog").select("*");

  if (cards && cards.length > 0) await db.rneCards.bulkPut(cards);
  if (materials && materials.length > 0) await db.materials.bulkPut(materials);

  await db.meta.put({
    key: "lastSync",
    value: new Date().toISOString(),
  });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  if (!db) {
    return {
      online: false,
      configured: false,
      syncing: false,
      pending: 0,
      lastSync: null,
      error: null,
    };
  }

  const pending = await db.outbox.count();
  const lastSync = (await db.meta.get("lastSync"))?.value ?? null;
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : false,
    configured: Boolean(createClient()),
    syncing: syncInProgress,
    pending,
    lastSync,
    error: null,
  };
}

export function startOnlineSync(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onOnline = (): void => {
    void flushOutbox().then(() => pullRemote());
  };
  window.addEventListener("online", onOnline);

  return () => window.removeEventListener("online", onOnline);
}
