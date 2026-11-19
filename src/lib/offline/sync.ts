import { createClient, createSyncClient } from "@/lib/supabase/client";
import { canUseProCards } from "@/lib/plans/plans";
import { loadPlanSnapshot } from "@/lib/plans/plan-store";
import {
  db,
  type FeeQuote,
  type Outbox,
  type OutboxTable,
  type Project,
  type ProjectNote,
  type ProjectPhoto,
  type Takeoff,
  type TrazzoDB,
} from "./db";
import {
  describeSyncResult,
  planPull,
  projectToRow,
  quoteToRow,
  recordToRow,
  rowToNote,
  rowToPhoto,
  rowToProject,
  rowToQuote,
  rowToTakeoff,
  takeoffToRow,
  recordTime,
  versionFromRow,
  type RemoteVersion,
  type SyncResult,
} from "./sync-mappers";
import { retryDelay, subscribeToSyncTriggers } from "./sync-lifecycle";
import { PROFILE_DIRTY, syncProfile } from "./profile-sync";
import { DEFAULT_STUDIO_PROFILE } from "./profile";
import { compressImageForSync } from "@/lib/ui/image-budget";

export { describeSyncResult };
export type { SyncResult };

export interface SyncActivity {
  syncing: boolean;
  signedIn: boolean;
  accountMismatch: boolean;
}

export interface SyncStatus extends SyncActivity {
  online: boolean;
  configured: boolean;
  pending: number;
  lastSync: string | null;
  error: string | null;
}

type Client = ReturnType<typeof createSyncClient>;
type Row = Record<string, unknown> & { id: string };
const LAST_SYNC = "lastSync";
const LAST_ERROR = "lastSyncError";
const OWNER = "sync:owner";
const DELETION_PREFIX = "sync:deleted:";
const initialActivity: SyncActivity = { syncing: false, signedIn: false, accountMismatch: false };
let activity = initialActivity;
const listeners = new Set<() => void>();
let scheduled: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let rerun = false;

export function subscribeSyncActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSyncActivity = () => activity;
export const getInitialSyncActivity = () => initialActivity;

function publish(patch: Partial<SyncActivity>) {
  activity = { ...activity, ...patch };
  for (const listener of listeners) listener();
}

const online = () => typeof navigator !== "undefined" && navigator.onLine;

function result(status: SyncResult["status"], patch: Partial<SyncResult> = {}): SyncResult {
  return { status, sent: 0, failed: 0, pulled: 0, error: null, ...patch };
}

const errorMessage = (error: unknown) =>
  typeof (error as { message?: unknown } | null)?.message === "string"
    ? (error as { message: string }).message
    : "Error de red.";

function payloadId(item: Outbox): string {
  const id = (item.payload as { id?: unknown } | null)?.id;
  if (typeof id !== "string") throw new Error("Cambio sin identificador.");
  return id;
}

function remoteTable(table: OutboxTable): string {
  if (table === "takeoffs") return "project_takeoffs";
  if (table === "project_notes" || table === "project_photos") return "project_records";
  return table;
}

async function writeRemote(client: Client, userId: string, item: Outbox, id: string) {
  const table = remoteTable(item.table);
  if (item.op === "delete") {
    const { error } = await client
      .from(table)
      .update({
        updated_at: item.createdAt,
        deleted_at: item.createdAt,
        ...(table === "project_records" ? { data: {} } : {}),
      })
      .eq("id", id)
      .lt("updated_at", item.createdAt);
    if (error) throw error;
    return;
  }

  const row =
    item.table === "projects"
      ? projectToRow(item.payload as Project, userId)
      : item.table === "takeoffs"
        ? takeoffToRow(item.payload as Takeoff)
        : item.table === "fee_quotes"
          ? quoteToRow(item.payload as FeeQuote, userId)
          : recordToRow(
              item.payload as ProjectNote | ProjectPhoto,
              item.table === "project_notes" ? "note" : "photo",
            );
  const { error } = await client.from(table).upsert({ ...row, deleted_at: null });
  if (error) throw error;
}

async function flush(local: TrazzoDB, client: Client, userId: string): Promise<SyncResult> {
  const pending = await local.outbox.orderBy("id").toArray();
  const blocked = new Set<string>();
  let sent = 0;
  let error: string | null = null;
  for (const item of pending) {
    let key: string | undefined;
    try {
      const id = payloadId(item);
      key = item.table + ":" + id;
      const parent = (item.payload as { projectId?: string }).projectId;
      if (blocked.has(key) || (parent && blocked.has("projects:" + parent))) continue;
      await writeRemote(client, userId, item, id);
      if (item.id !== undefined) {
        const queueId = item.id;
        await local.transaction("rw", [local.outbox, local.meta], async () => {
          if (item.op === "delete") await rememberDeletion(local, key!, item.createdAt);
          await local.outbox.delete(queueId);
        });
      }
      sent++;
    } catch (cause) {
      if (key) blocked.add(key);
      error = errorMessage(cause);
    }
  }
  const failed = pending.length - sent;
  return result(failed ? "partial" : "ok", { sent, failed, error });
}

async function rememberDeletion(local: TrazzoDB, entity: string, updatedAt: string) {
  const key = DELETION_PREFIX + entity;
  const previous = await local.meta.get(key);
  if (!previous || Date.parse(previous.value) < Date.parse(updatedAt)) {
    await local.meta.put({ key, value: updatedAt });
  }
}

/** An old pull in another tab must never resurrect a deletion already acknowledged. */
async function applyDeletionHistory<T>(
  local: TrazzoDB,
  table: OutboxTable,
  versions: RemoteVersion<T>[],
): Promise<RemoteVersion<T>[]> {
  const prefix = DELETION_PREFIX + table + ":";
  const deletes = new Map(
    (await local.meta.where("key").startsWith(prefix).toArray()).map(({ key, value }) => [
      key.slice(prefix.length),
      Date.parse(value),
    ]),
  );
  for (const { id, record, updatedAt } of versions) {
    if (!record && (deletes.get(id) ?? 0) < Date.parse(updatedAt)) {
      await local.meta.put({ key: prefix + id, value: updatedAt });
      deletes.set(id, Date.parse(updatedAt));
    }
  }
  return versions.filter((row) => !row.record || (deletes.get(row.id) ?? 0) < recordTime(row));
}

/** Keyset paging avoids silently truncating an account at the PostgREST row limit. */
async function fetchRows(
  client: Client,
  table: string,
  pageSize: number,
  columns = "*",
): Promise<Row[]> {
  const rows: Row[] = [];
  let after: string | undefined;
  for (;;) {
    let query = client.from(table).select(columns).order("id").limit(pageSize);
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) return rows;
    const page = data as unknown as Row[];
    rows.push(...page);
    after = page.at(-1)!.id;
  }
}

/** Already backed up photos don't need to be downloaded on every reconnect. */
async function fetchProjectRecords(local: TrazzoDB, client: Client): Promise<Row[]> {
  const [versions, notes, photos] = await Promise.all([
    fetchRows(client, "project_records", 100, "id,project_id,kind,updated_at,deleted_at"),
    local.project_notes.toArray(),
    local.project_photos.toArray(),
  ]);
  const current = new Map([...notes, ...photos].map((row) => [row.id, row]));
  const changed = versions.filter((row) => {
    const existing = current.get(row.id);
    return (
      !row.deleted_at &&
      (existing?.syncState !== "synced" ||
        recordTime(existing) < recordTime({ updatedAt: row.updated_at as string }))
    );
  });
  const records = versions.filter((row) => row.deleted_at);
  for (let index = 0; index < changed.length; index += 10) {
    const ids = changed.slice(index, index + 10).map((row) => row.id);
    const { data, error } = await client.from("project_records").select("*").in("id", ids);
    if (error) throw error;
    records.push(...data);
  }
  return records;
}

async function pullPrivate(local: TrazzoDB, client: Client): Promise<number> {
  const [projects, takeoffs, quotes, records] = await Promise.all([
    fetchRows(client, "projects", 100),
    fetchRows(client, "project_takeoffs", 100),
    fetchRows(client, "fee_quotes", 50),
    fetchProjectRecords(local, client),
  ]);
  const activeProjectIds = new Set(projects.filter((row) => !row.deleted_at).map((row) => row.id));
  const projectVersions = projects.map((row) => versionFromRow(row, rowToProject));
  const takeoffVersions = takeoffs
    .filter((row) => activeProjectIds.has(row.project_id as string))
    .map((row) => versionFromRow(row, rowToTakeoff));
  const quoteVersions = quotes.map((row) => versionFromRow(row, rowToQuote));
  const activeRecords = records.filter((row) => activeProjectIds.has(row.project_id as string));
  const noteVersions = activeRecords
    .filter((row) => row.kind === "note")
    .map((row) => versionFromRow(row, rowToNote));
  const photoVersions = activeRecords
    .filter((row) => row.kind === "photo")
    .map((row) => versionFromRow(row, rowToPhoto));

  // Read the queue and the current device versions inside the same transaction
  // as the writes. A device edit made during the network request wins here.
  return local.transaction(
    "rw",
    [
      local.outbox,
      local.projects,
      local.takeoffs,
      local.fee_quotes,
      local.project_notes,
      local.project_photos,
      local.meta,
    ],
    async () => {
      const pending = new Map<OutboxTable, Set<string>>();
      for (const item of await local.outbox.toArray()) {
        const id = (item.payload as { id?: string } | null)?.id;
        if (!id) continue;
        if (!pending.has(item.table)) pending.set(item.table, new Set());
        pending.get(item.table)!.add(id);
      }

      const [deviceProjects, deviceTakeoffs, deviceNotes, devicePhotos, deviceQuotes] =
        await Promise.all([
          local.projects.toArray(),
          local.takeoffs.toArray(),
          local.project_notes.toArray(),
          local.project_photos.toArray(),
          local.fee_quotes.toArray(),
        ]);
      const pendingProjects = pending.get("projects") ?? new Set<string>();
      const latestChild = new Map<string, number>();
      for (const row of [...deviceTakeoffs, ...deviceNotes, ...devicePhotos]) {
        latestChild.set(
          row.projectId,
          Math.max(latestChild.get(row.projectId) ?? 0, recordTime(row)),
        );
      }
      const tombstones = new Map(
        projectVersions
          .filter((version) => !version.record)
          .map((version) => [version.id, recordTime(version)]),
      );
      for (const project of deviceProjects) {
        const deleted = tombstones.get(project.id);
        const edited = latestChild.get(project.id);
        if (deleted === undefined || edited === undefined || edited <= deleted) continue;
        // A stale project deletion must not hide work added later in the field.
        const updatedAt = new Date(Math.max(edited, recordTime(project))).toISOString();
        const recovered: Project = { ...project, updatedAt, syncState: "pending" };
        await local.projects.put(recovered);
        await local.outbox.add({
          table: "projects",
          op: "upsert",
          payload: recovered,
          createdAt: updatedAt,
        });
        pendingProjects.add(project.id);
        rerun = true;
      }

      const projectPlan = planPull(
        deviceProjects,
        await applyDeletionHistory(local, "projects", projectVersions),
        pendingProjects,
      );
      await local.projects.bulkPut(projectPlan.put);
      await local.projects.bulkDelete(projectPlan.remove);

      // Do not recreate children of a project that is pending deletion locally.
      const liveProjects = new Set(await local.projects.toCollection().primaryKeys());
      const takeoffPlan = planPull(
        deviceTakeoffs,
        (await applyDeletionHistory(local, "takeoffs", takeoffVersions)).filter(
          (version) => !version.record || liveProjects.has(version.record.projectId),
        ),
        pending.get("takeoffs") ?? new Set(),
      );
      const quotePlan = planPull(
        deviceQuotes,
        await applyDeletionHistory(local, "fee_quotes", quoteVersions),
        pending.get("fee_quotes") ?? new Set(),
      );
      const notePlan = planPull(
        deviceNotes,
        (await applyDeletionHistory(local, "project_notes", noteVersions)).filter(
          (version) => !version.record || liveProjects.has(version.record.projectId),
        ),
        pending.get("project_notes") ?? new Set(),
      );
      const photoPlan = planPull(
        devicePhotos,
        (await applyDeletionHistory(local, "project_photos", photoVersions)).filter(
          (version) => !version.record || liveProjects.has(version.record.projectId),
        ),
        pending.get("project_photos") ?? new Set(),
      );
      await local.takeoffs.bulkPut(takeoffPlan.put);
      await local.takeoffs.bulkDelete(takeoffPlan.remove);
      await local.fee_quotes.bulkPut(quotePlan.put);
      await local.fee_quotes.bulkDelete(quotePlan.remove);
      await local.project_notes.bulkPut(notePlan.put);
      await local.project_notes.bulkDelete(notePlan.remove);
      await local.project_photos.bulkPut(photoPlan.put);
      await local.project_photos.bulkDelete(photoPlan.remove);
      return (
        projectPlan.put.length +
        projectPlan.remove.length +
        takeoffPlan.put.length +
        takeoffPlan.remove.length +
        quotePlan.put.length +
        quotePlan.remove.length +
        notePlan.put.length +
        notePlan.remove.length +
        photoPlan.put.length +
        photoPlan.remove.length
      );
    },
  );
}

async function syncCatalogue(local: TrazzoDB, client: Client) {
  const { plan } = await loadPlanSnapshot();
  const [cards, materials] = await Promise.all([
    client
      .from("rne_cards")
      .select("*")
      .or(canUseProCards(plan) ? "is_pro.eq.false,is_pro.eq.true" : "is_pro.eq.false"),
    client.from("materials_catalog").select("*"),
  ]);
  if (cards.data?.length) await local.rneCards.bulkPut(cards.data);
  if (materials.data?.length) await local.materials.bulkPut(materials.data);
}

/** One account-bound pass for both directions. Changes stay queued on any write failure. */
export async function syncNow(): Promise<SyncResult> {
  const local = db;
  if (!local) return result("error");
  const authClient = createClient();
  if (!authClient) return result("not-configured");
  if (!online()) return result("offline");
  if (activity.syncing) {
    rerun = true;
    return result("busy");
  }

  if (scheduled) clearTimeout(scheduled);
  scheduled = null;
  publish({ syncing: true });
  let outcome = result("signed-out");
  try {
    const {
      data: { session },
      error,
    } = await authClient.auth.getSession();
    if (error) throw error;
    publish({ signedIn: Boolean(session), accountMismatch: false });
    if (session) {
      const userId = session.user.id;
      const ownsDevice = await local.transaction("rw", local.meta, async () => {
        const owner = (await local.meta.get(OWNER))?.value;
        if (owner) return owner === userId;
        await local.meta.put({ key: OWNER, value: userId });
        return true;
      });
      if (!ownsDevice) {
        publish({ accountMismatch: true });
        return result("account-mismatch");
      }
      const client = createSyncClient(session.access_token);
      outcome = await flush(local, client, userId);
      outcome.pulled = await pullPrivate(local, client);
      // Profile, photo and studio brand: reconciled by newest updatedAt.
      const profile = await syncProfile(
        local,
        client,
        userId,
        compressImageForSync,
        DEFAULT_STUDIO_PROFILE,
      ).catch((cause: unknown) => ({ action: "none" as const, error: errorMessage(cause) }));
      if (profile.action === "pull") outcome.pulled += 1;
      if (profile.action === "push" && !profile.error) outcome.sent += 1;
      if (profile.error) {
        outcome.failed += 1;
        outcome.error = outcome.error ? outcome.error + " · " + profile.error : profile.error;
        if (outcome.status === "ok") outcome.status = "partial";
      }
      if (outcome.error) await local.meta.put({ key: LAST_ERROR, value: outcome.error });
      else {
        await local.meta.delete(LAST_ERROR);
        await local.meta.put({ key: LAST_SYNC, value: new Date().toISOString() });
      }
      // Catalogue failure must not turn a successful private backup into a retry.
      void syncCatalogue(local, client).catch(() => undefined);
    }
    return outcome;
  } catch (cause) {
    outcome = { ...outcome, status: "error", error: errorMessage(cause) };
    await local.meta.put({ key: LAST_ERROR, value: outcome.error! }).catch(() => undefined);
    return outcome;
  } finally {
    publish({ syncing: false });
    if (outcome.status === "partial" || outcome.status === "error") {
      scheduleSync(retryDelay(failures++));
    } else {
      failures = 0;
      if (rerun) scheduleSync(0);
    }
    rerun = false;
  }
}

export function scheduleSync(delayMs = 2500): void {
  if (!online() || !createClient()) return;
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void syncNow();
  }, delayMs);
}

export async function getSyncStatus(): Promise<Omit<SyncStatus, keyof SyncActivity | "online">> {
  return {
    configured: Boolean(createClient()),
    // Queued rows plus the profile, when it has an edit the cloud has not confirmed.
    pending: ((await db?.outbox.count()) ?? 0) + ((await db?.meta.get(PROFILE_DIRTY)) ? 1 : 0),
    lastSync: (await db?.meta.get(LAST_SYNC))?.value ?? null,
    error: (await db?.meta.get(LAST_ERROR))?.value ?? null,
  };
}

export function describeSyncStatus(status: SyncStatus): string {
  if (status.syncing) return "Sincronizando…";
  if (status.accountMismatch) return "Datos de otra cuenta en este dispositivo";
  if (!status.configured) return "Guardado en este dispositivo";
  if (status.pending || status.error) return "Pendiente de sincronizar";
  if (status.signedIn && status.lastSync) return "Respaldado en la nube";
  return "Guardado en este dispositivo";
}

export function startOnlineSync(): () => void {
  const client = createClient();
  if (!client) return () => undefined;
  const stop = subscribeToSyncTriggers(window, document, () => scheduleSync(0));
  let profileFeed: { userId: string; stop: () => void } | null = null;
  const auth = client.auth.onAuthStateChange((event, session) => {
    if (!session) {
      publish({ signedIn: false, accountMismatch: false });
      profileFeed?.stop();
      profileFeed = null;
    }
    // Supabase auth callbacks run under an auth lock; schedule outside it.
    if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
      // Show a cloud confirmation only after this account has been checked.
      publish({ signedIn: false });
      scheduleSync(0);
      if (profileFeed?.userId !== session.user.id) {
        profileFeed?.stop();
        profileFeed = {
          userId: session.user.id,
          stop: watchRemoteProfile(client, session.user.id),
        };
      }
    }
  });
  return () => {
    stop();
    profileFeed?.stop();
    auth.data.subscription.unsubscribe();
    if (scheduled) clearTimeout(scheduled);
    scheduled = null;
  };
}

/**
 * Another device saved the profile, photo or logo: Supabase Realtime announces the
 * change on this account's row and a sync pulls it at once, so an open phone shows
 * a photo saved on the desktop without waiting for a reload or a tab switch.
 * Our own push echoes back too; it is skipped when the version is already here.
 */
function watchRemoteProfile(
  client: NonNullable<ReturnType<typeof createClient>>,
  userId: string,
): () => void {
  // Realtime is an accelerator: without it the regular triggers still sync.
  if (typeof client.channel !== "function") return () => undefined;
  const channel = client
    .channel("profile:" + userId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: "id=eq." + userId },
      (change) => {
        const version = (change.new as { profile_updated_at?: string | null }).profile_updated_at;
        void (async () => {
          const local = await db?.studio_profile.get("default");
          if (version && local?.updatedAt === version) return;
          scheduleSync(300);
        })();
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
