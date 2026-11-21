import { createClient, createSyncClient } from "@/lib/supabase/client";
import { canUseProCards } from "@/lib/plans/plans";
import { loadPlanSnapshot } from "@/lib/plans/plan-store";
import {
  type FeeQuote,
  type Outbox,
  type OutboxTable,
  type Project,
  type ProjectNote,
  type ProjectPhoto,
  type Takeoff,
  type SiteLog,
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
  rowToSiteLog,
  siteLogToRow,
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
import { DELETION_PREFIX, SYNC_OWNER } from "./sync-keys";
import {
  GUEST_WORKSPACE,
  getActiveDatabase,
  getActiveWorkspaceId,
  subscribeWorkspace,
  WORKSPACE_OWNER,
} from "./workspace";

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

const legacyProjectColumns = new WeakSet<TrazzoDB>();

subscribeWorkspace(() => {
  if (scheduled) clearTimeout(scheduled);
  scheduled = null;
  failures = 0;
  rerun = false;
  publish(initialActivity);
  scheduleSync(0);
});

async function writeRemote(
  local: TrazzoDB,
  client: Client,
  userId: string,
  item: Outbox,
  id: string,
) {
  const table = remoteTable(item.table);
  if (item.op === "delete" && item.table === "site_logs") {
    const { error } = await client.from(table).upsert({
      id,
      user_id: userId,
      project_id: (item.payload as { projectId?: string | null }).projectId ?? null,
      data: {},
      updated_at: item.createdAt,
      deleted_at: item.createdAt,
    });
    if (error) throw error;
    return;
  }
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
          : item.table === "site_logs"
            ? siteLogToRow(item.payload as SiteLog, userId)
            : recordToRow(
                item.payload as ProjectNote | ProjectPhoto,
                item.table === "project_notes" ? "note" : "photo",
              );
  const payload: Record<string, unknown> = { ...row, deleted_at: null };
  if (item.table === "projects") {
    const legacyPayload = { ...payload };
    delete legacyPayload.client;
    delete legacyPayload.built_area;
    const result = await client
      .from(table)
      .upsert(legacyProjectColumns.has(local) ? legacyPayload : payload);
    if (!result.error) return;
    if (legacyProjectColumns.has(local) || !["PGRST204", "42703"].includes(result.error.code))
      throw result.error;
    if (getActiveDatabase() !== local) return;
    legacyProjectColumns.add(local);
    const { error } = await client.from(table).upsert(legacyPayload);
    if (error) throw error;
    return;
  }
  const { error } = await client.from(table).upsert(payload);
  if (error) throw error;
}

async function flush(local: TrazzoDB, client: Client, userId: string): Promise<SyncResult> {
  const pending = await local.outbox.orderBy("id").toArray();
  const blocked = new Set<string>();
  let sent = 0;
  let error: string | null = null;
  for (const item of pending) {
    if (getActiveDatabase() !== local) break;
    let key: string | undefined;
    try {
      const id = payloadId(item);
      key = item.table + ":" + id;
      const parent =
        item.table === "site_logs" ? undefined : (item.payload as { projectId?: string }).projectId;
      if (blocked.has(key) || (parent && blocked.has("projects:" + parent))) continue;
      await writeRemote(local, client, userId, item, id);
      if (getActiveDatabase() !== local) break;
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
async function fetchVersionedRecords(
  client: Client,
  table: "project_records" | "site_logs",
  localRecords: PromiseLike<Array<ProjectNote | ProjectPhoto | SiteLog>>,
): Promise<Row[]> {
  const columns =
    table === "project_records"
      ? "id,project_id,kind,updated_at,deleted_at"
      : "id,updated_at,deleted_at";
  const [versions, localRows] = await Promise.all([
    fetchRows(client, table, 100, columns),
    localRecords,
  ]);
  const current = new Map(localRows.map((row) => [row.id, row]));
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
    const { data, error } = await client.from(table).select("*").in("id", ids);
    if (error) throw error;
    records.push(...data);
  }
  return records;
}

async function pullPrivate(local: TrazzoDB, client: Client): Promise<number> {
  const [projects, takeoffs, quotes, records, siteLogs] = await Promise.all([
    fetchRows(client, "projects", 100),
    fetchRows(client, "project_takeoffs", 100),
    fetchRows(client, "fee_quotes", 50),
    fetchVersionedRecords(
      client,
      "project_records",
      Promise.all([local.project_notes.toArray(), local.project_photos.toArray()]).then(
        ([notes, photos]) => [...notes, ...photos],
      ),
    ),
    fetchVersionedRecords(client, "site_logs", local.site_logs.toArray()),
  ]);
  const activeProjectIds = new Set(projects.filter((row) => !row.deleted_at).map((row) => row.id));

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

  const siteLogVersions = siteLogs.map((row) => versionFromRow(row, rowToSiteLog));

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
      local.site_logs,
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
      const previousProjects = new Map(deviceProjects.map((project) => [project.id, project]));
      const projectVersions = projects.map((row) =>
        versionFromRow(row, (data) => {
          const previous = previousProjects.get(row.id);
          const project = rowToProject(data);
          if (!project || !previous) return project;
          return {
            ...project,
            client: "client" in data ? project.client : previous.client,
            builtArea: "built_area" in data ? project.builtArea : previous.builtArea,
          };
        }),
      );
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
      const siteLogPlan = planPull(
        await local.site_logs.toArray(),
        await applyDeletionHistory(local, "site_logs", siteLogVersions),
        pending.get("site_logs") ?? new Set(),
      );
      await local.site_logs.bulkPut(siteLogPlan.put);
      await local.site_logs.bulkDelete(siteLogPlan.remove);
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
        photoPlan.remove.length +
        siteLogPlan.put.length +
        siteLogPlan.remove.length
      );
    },
  );
}

async function syncCatalogue(local: TrazzoDB, client: Client) {
  if (getActiveDatabase() !== local) return;
  const { plan } = await loadPlanSnapshot();
  if (getActiveDatabase() !== local) return;
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
  const authClient = createClient();
  if (!authClient) return result("not-configured");
  const workspaceId = getActiveWorkspaceId();
  if (workspaceId === GUEST_WORKSPACE) return result("signed-out");
  if (!online()) return result("offline");
  const local = getActiveDatabase();
  const isCurrent = () => getActiveDatabase() === local;
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
    if (!isCurrent()) return outcome;
    if (error) throw error;
    if (session && session.user.id !== workspaceId) return outcome;
    publish({ signedIn: Boolean(session), accountMismatch: false });
    if (session) {
      const userId = session.user.id;
      const ownsWorkspace = await local.transaction("rw", local.meta, async () => {
        const [legacyOwner, owner] = await local.meta.bulkGet([SYNC_OWNER, WORKSPACE_OWNER]);
        if ([legacyOwner, owner].some((entry) => entry && entry.value !== userId)) return false;
        if (!legacyOwner) await local.meta.put({ key: SYNC_OWNER, value: userId });
        return true;
      });
      if (!isCurrent()) return outcome;
      if (!ownsWorkspace) {
        publish({ accountMismatch: true });
        return result("account-mismatch");
      }
      const client = createSyncClient(session.access_token);
      outcome = await flush(local, client, userId);
      if (!isCurrent()) return result("signed-out");
      outcome.pulled = await pullPrivate(local, client);
      if (!isCurrent()) return result("signed-out");
      // Profile, photo and studio brand: reconciled by newest updatedAt.
      const profile = await syncProfile(
        local,
        client,
        userId,
        compressImageForSync,
        DEFAULT_STUDIO_PROFILE,
      ).catch((cause: unknown) => ({ action: "none" as const, error: errorMessage(cause) }));
      if (!isCurrent()) return result("signed-out");
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
    if (!isCurrent()) return result("signed-out");
    outcome = { ...outcome, status: "error", error: errorMessage(cause) };
    await local.meta.put({ key: LAST_ERROR, value: outcome.error! }).catch(() => undefined);
    return outcome;
  } finally {
    if (isCurrent()) {
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
}

export function scheduleSync(delayMs = 2500): void {
  if (getActiveWorkspaceId() === GUEST_WORKSPACE || !online() || !createClient()) return;
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void syncNow();
  }, delayMs);
}

export async function getSyncStatus(): Promise<Omit<SyncStatus, keyof SyncActivity | "online">> {
  const local = typeof window === "undefined" ? null : getActiveDatabase();
  const [count, dirty, lastSync, error] = await Promise.all([
    local?.outbox.count(),
    local?.meta.get(PROFILE_DIRTY),
    local?.meta.get(LAST_SYNC),
    local?.meta.get(LAST_ERROR),
  ]);
  return {
    configured: Boolean(createClient()),
    pending: (count ?? 0) + Number(Boolean(dirty)),
    lastSync: lastSync?.value ?? null,
    error: error?.value ?? null,
  };
}

export function describeSyncStatus(status: SyncStatus): string {
  if (status.syncing) return "Sincronizando…";
  if (status.accountMismatch) return "La cuenta no coincide con el espacio activo";
  if (!status.configured || !status.signedIn) return "Guardado en este dispositivo";
  if (status.pending || status.error) return "Pendiente de sincronizar";
  if (status.signedIn && status.lastSync) return "Respaldado en la nube";
  return "Guardado en este dispositivo";
}

export function startOnlineSync(): () => void {
  const client = createClient();
  if (!client) return () => undefined;
  const stop = subscribeToSyncTriggers(window, document, () => scheduleSync(0));
  let profileFeed: { userId: string; stop: () => void } | null = null;
  const updateFeed = () => {
    const userId = getActiveWorkspaceId();
    if (profileFeed?.userId === userId) return;
    profileFeed?.stop();
    profileFeed =
      userId === GUEST_WORKSPACE
        ? null
        : {
            userId,
            stop: watchRemoteProfile(client, userId),
          };
  };
  updateFeed();
  const unsubscribe = subscribeWorkspace(updateFeed);
  return () => {
    stop();
    profileFeed?.stop();
    unsubscribe();
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
          if (getActiveWorkspaceId() !== userId) return;
          const database = getActiveDatabase();
          const local = await database.studio_profile.get("default").catch(() => undefined);
          if (database !== getActiveDatabase() || (version && local?.updatedAt === version)) return;
          scheduleSync(300);
        })();
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
