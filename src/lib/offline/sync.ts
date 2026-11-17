import { documentedCatalog } from "./documented-catalog";
import type { RneCard } from "@/data/seed-rne";
import { db, ensureSeeded, type FeeQuote, type Outbox, type Project, type Takeoff } from "./db";
import {
  describeSyncResult,
  planPull,
  projectToRow,
  quoteToRow,
  rowToProject,
  rowToQuote,
  rowToTakeoff,
  takeoffToRow,
  type SyncResult,
} from "./sync-mappers";
import { createClient } from "@/lib/supabase/client";
import { canUseProCards } from "@/lib/plans/plans";
import { loadPlanSnapshot } from "@/lib/plans/plan-store";

export { ensureSeeded, describeSyncResult };
export type { SyncResult };

export interface SyncStatus {
  online: boolean;
  configured: boolean;
  syncing: boolean;
  pending: number;
  lastSync: string | null;
  error: string | null;
}

type Client = NonNullable<ReturnType<typeof createClient>>;

const LAST_SYNC = "lastSync";
const LAST_ERROR = "lastSyncError";

let syncInProgress = false;

function result(status: SyncResult["status"], patch: Partial<SyncResult> = {}): SyncResult {
  return { status, sent: 0, failed: 0, pulled: 0, error: null, ...patch };
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? false : navigator.onLine;
}

async function sessionUserId(client: Client): Promise<string | null> {
  try {
    const { data } = await client.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

function payloadId(item: Outbox): string | null {
  const id = (item.payload as { id?: unknown } | null)?.id;
  return typeof id === "string" ? id : null;
}

/** Sends one queued change. Returns an error message, or null when the cloud accepted it. */
async function writeRemoteItem(
  client: Client,
  userId: string,
  item: Outbox,
): Promise<string | null> {
  const id = payloadId(item);
  if (!id) return "Cambio sin identificador.";

  const table =
    item.table === "projects"
      ? "projects"
      : item.table === "takeoffs"
        ? "project_takeoffs"
        : "fee_quotes";

  if (item.op === "delete") {
    const { error } = await client.from(table).delete().eq("id", id);
    return error ? error.message : null;
  }

  const row =
    item.table === "projects"
      ? projectToRow(item.payload as Project, userId)
      : item.table === "takeoffs"
        ? takeoffToRow(item.payload as Takeoff)
        : quoteToRow(item.payload as FeeQuote, userId);
  const { error } = await client.from(table).upsert(row);
  return error ? error.message : null;
}

async function markSynced(sent: Outbox[]): Promise<void> {
  if (!db) return;
  const stillPending = new Set((await db.outbox.toArray()).map(payloadId));
  for (const item of sent) {
    const id = payloadId(item);
    if (!id || item.op === "delete" || stillPending.has(id)) continue;
    const table =
      item.table === "projects"
        ? db.projects
        : item.table === "takeoffs"
          ? db.takeoffs
          : db.fee_quotes;
    await table.update(id, { syncState: "synced" });
  }
}

/**
 * Sends queued changes to the cloud. A change leaves the queue only when the
 * cloud accepted it; failures stay queued and are retried on the next run.
 */
export async function flushOutbox(): Promise<SyncResult> {
  if (!db) return result("error");
  const client = createClient();
  if (!client) return result("not-configured");
  if (!isOnline()) return result("offline");
  if (syncInProgress) return result("busy");

  syncInProgress = true;
  try {
    const userId = await sessionUserId(client);
    if (!userId) return result("signed-out");

    const pending = await db.outbox.orderBy("id").toArray();
    const sent: Outbox[] = [];
    let lastError: string | null = null;
    for (const item of pending) {
      let error: string | null;
      try {
        error = await writeRemoteItem(client, userId, item);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : "Error de red.";
      }
      if (error) {
        lastError = error;
        continue;
      }
      if (item.id !== undefined) await db.outbox.delete(item.id);
      sent.push(item);
    }
    await markSynced(sent);

    const failed = pending.length - sent.length;
    if (lastError) await db.meta.put({ key: LAST_ERROR, value: lastError });
    else await db.meta.delete(LAST_ERROR);
    return result(failed > 0 ? "partial" : "ok", { sent: sent.length, failed, error: lastError });
  } catch (cause) {
    return result("error", { error: cause instanceof Error ? cause.message : null });
  } finally {
    syncInProgress = false;
  }
}

async function pullPrivate(client: Client): Promise<number> {
  if (!db) return 0;
  const localDb = db;
  const [projects, takeoffs, quotes] = await Promise.all([
    client.from("projects").select("*"),
    client.from("project_takeoffs").select("*"),
    client.from("fee_quotes").select("*"),
  ]);
  if (projects.error) throw projects.error;
  if (takeoffs.error) throw takeoffs.error;
  if (quotes.error) throw quotes.error;

  const pendingIds = new Set(
    (await localDb.outbox.toArray()).map(payloadId).filter((id): id is string => Boolean(id)),
  );
  const remoteProjects = (projects.data ?? []).map(rowToProject).filter((r) => r !== null);
  const remoteTakeoffs = (takeoffs.data ?? []).map(rowToTakeoff).filter((r) => r !== null);
  const remoteQuotes = (quotes.data ?? []).map(rowToQuote).filter((r) => r !== null);

  const projectPlan = planPull(await localDb.projects.toArray(), remoteProjects, pendingIds);
  const takeoffPlan = planPull(await localDb.takeoffs.toArray(), remoteTakeoffs, pendingIds);
  const quotePlan = planPull(await localDb.fee_quotes.toArray(), remoteQuotes, pendingIds);

  await localDb.transaction(
    "rw",
    [localDb.projects, localDb.takeoffs, localDb.fee_quotes],
    async () => {
      await localDb.projects.bulkPut(projectPlan.put);
      await localDb.projects.bulkDelete(projectPlan.remove);
      await localDb.takeoffs.bulkPut(takeoffPlan.put);
      await localDb.takeoffs.bulkDelete(takeoffPlan.remove);
      await localDb.fee_quotes.bulkPut(quotePlan.put);
      await localDb.fee_quotes.bulkDelete(quotePlan.remove);
    },
  );
  return projectPlan.put.length + takeoffPlan.put.length + quotePlan.put.length;
}

/**
 * Downloads the public catalogue and, for a signed-in user, their projects,
 * takeoffs and fee quotes. Pro cards are requested only for a paid plan.
 */
export async function pullRemote(): Promise<SyncResult> {
  if (!db) return result("error");
  const client = createClient();
  if (!client) return result("not-configured");
  if (!isOnline()) return result("offline");

  try {
    const { plan } = await loadPlanSnapshot();
    const { data: cards } = await client
      .from("rne_cards")
      .select("*")
      .or(canUseProCards(plan) ? "is_pro.eq.false,is_pro.eq.true" : "is_pro.eq.false");
    const { data: materials } = await client.from("materials_catalog").select("*");
    if (cards) await db.rneCards.bulkPut(documentedCatalog(cards as RneCard[]));
    if (materials && materials.length > 0) await db.materials.bulkPut(materials);

    const userId = await sessionUserId(client);
    if (!userId) return result("signed-out");

    const pulled = await pullPrivate(client);
    await db.meta.put({ key: LAST_SYNC, value: new Date().toISOString() });
    return result("ok", { pulled });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Error de red.";
    await db.meta.put({ key: LAST_ERROR, value: error });
    return result("error", { error });
  }
}

/** Sends local changes, then downloads the account's data. */
export async function syncNow(): Promise<SyncResult> {
  const sent = await flushOutbox();
  if (sent.status !== "ok" && sent.status !== "partial") return sent;
  const pulled = await pullRemote();
  if (pulled.status !== "ok") return { ...pulled, sent: sent.sent, failed: sent.failed };
  return { ...sent, pulled: pulled.pulled };
}

let scheduled: ReturnType<typeof setTimeout> | null = null;

/** Called after a local save: sends the queue shortly after, when there is a connection. */
export function scheduleSync(delayMs = 2500): void {
  if (typeof window === "undefined" || !isOnline()) return;
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void flushOutbox();
  }, delayMs);
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
  const lastSync = (await db.meta.get(LAST_SYNC))?.value ?? null;
  const error = (await db.meta.get(LAST_ERROR))?.value ?? null;
  return {
    online: isOnline(),
    configured: Boolean(createClient()),
    syncing: syncInProgress,
    pending,
    lastSync,
    error,
  };
}

export function startOnlineSync(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onOnline = (): void => {
    void syncNow();
  };
  window.addEventListener("online", onOnline);

  return () => window.removeEventListener("online", onOnline);
}
