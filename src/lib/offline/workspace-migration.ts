import Dexie, { type Table } from "dexie";
import { createLocalUuid, type Meta, type Outbox, TrazzoDB } from "./db";
import { DEFAULT_STUDIO_PROFILE } from "./profile";
import { PROFILE_DIRTY } from "./profile-sync";
import { DELETION_PREFIX, SYNC_OWNER } from "./sync-keys";
import {
  GUEST_WORKSPACE,
  isAccountWorkspaceId,
  WORKSPACE_OWNER,
  workspaceDbName,
} from "./workspace";
import { workspaceStorageEntries, workspaceStorageKey } from "./workspace-storage";

const MOVING = "workspace:moving";
const MOVE_DETAILS = "workspace:move-details";
const GUEST_CHOICE = "workspace:guest-choice";
const PROFILE_KEYS = ["professional:fullName", "professional:capNumber", PROFILE_DIRTY];
const USER_META = ["assistant-history", "fees:customRates", ...PROFILE_KEYS];
const SYNCABLE = [
  "projects",
  "takeoffs",
  "fee_quotes",
  "project_notes",
  "project_photos",
  "site_logs",
] as const;
const USER_TABLES = [...SYNCABLE, "project_links", "library_activity", "studio_profile"] as const;

type MoveOptions = { ownerId: string; enqueueForSync: boolean };
type MoveDetails = { token: string; enqueueForSync: boolean };
type Row = { updatedAt?: string; createdAt?: string; visitedAt?: string };
const version = (row: Row) =>
  [row.updatedAt, row.createdAt, row.visitedAt].find(
    (value) => value && Number.isFinite(Date.parse(value)),
  ) ?? "";
const time = (value: string) => Date.parse(value) || 0;
const outboxKey = (item: Outbox) =>
  JSON.stringify([
    item.table,
    item.op,
    (item.payload as { id?: string } | null)?.id,
    item.createdAt,
  ]);

function userMeta(row: Meta): boolean {
  return USER_META.includes(row.key) || row.key.startsWith(DELETION_PREFIX);
}

async function archiveConflict(target: TrazzoDB, key: string, value: string) {
  const archive = await target.meta.get(key);
  const values = new Set<string>(archive ? (JSON.parse(archive.value) as string[]) : []);
  if (values.has(value)) return;
  values.add(value);
  await target.meta.put({ key, value: JSON.stringify([...values]) });
}

function moveTables(local: TrazzoDB) {
  return [...USER_TABLES.map((name) => local.table(name)), local.outbox, local.meta];
}

export async function moveWorkspaceData(
  source: TrazzoDB,
  target: TrazzoDB,
  { ownerId, enqueueForSync }: MoveOptions,
): Promise<void> {
  if (
    !isAccountWorkspaceId(ownerId) ||
    source.name === target.name ||
    target.name !== workspaceDbName(ownerId)
  ) {
    throw new Error("El destino de los datos locales no coincide con la cuenta.");
  }
  const sourceId =
    source.name === workspaceDbName(GUEST_WORKSPACE)
      ? GUEST_WORKSPACE
      : source.name.slice("TrazzoDB-u-".length);

  // Commit the intent first. A crash after the target commit still leaves this marker.
  await source.transaction("rw", source.meta, async () => {
    const pending = (await source.meta.get(MOVING))?.value;
    const oldOwner = (await source.meta.get(SYNC_OWNER))?.value;
    if ((pending && pending !== ownerId) || (oldOwner && oldOwner !== ownerId)) {
      throw new Error("Los datos locales pertenecen a otro espacio.");
    }
    if (!pending || !(await source.meta.get(MOVE_DETAILS))) {
      const details: MoveDetails = { token: createLocalUuid(), enqueueForSync };
      await source.meta.bulkPut([
        { key: MOVING, value: ownerId },
        { key: MOVE_DETAILS, value: JSON.stringify(details) },
      ]);
    }
  });

  // Hold the source's write lock until the independent target commit has completed.
  // Another tab's IndexedDB writes cannot slip between the read and the cleanup.
  await source.transaction("rw", moveTables(source), async () => {
    if ((await source.meta.get(MOVING))?.value !== ownerId) return;
    const intent = await source.meta.get(MOVE_DETAILS);
    if (!intent) throw new Error("No se encontró el registro del traslado.");
    const details = JSON.parse(intent.value) as MoveDetails;
    const meta = await source.meta.filter(userMeta).toArray();
    const outbox = await source.outbox.toArray();
    const storageEntries = workspaceStorageEntries(sourceId);

    // Read from the source transaction before entering Dexie's independent target scope.
    const rows = new Map(
      await Promise.all(
        USER_TABLES.map(async (name) => {
          const table = source.table<Row, string>(name);
          const [keys, records] = await Promise.all([
            table.toCollection().primaryKeys(),
            table.toArray(),
          ]);
          return [name, records.map((record, index) => ({ key: keys[index], record }))] as const;
        }),
      ),
    );

    const conflicts = new Set<string>();
    await Dexie.waitFor(() =>
      target.transaction("rw", moveTables(target), async () => {
        const owners = await target.meta.bulkGet([WORKSPACE_OWNER, SYNC_OWNER]);
        if (owners.some((owner) => owner && owner.value !== ownerId)) {
          throw new Error("El destino de los datos locales tiene otro propietario.");
        }
        const receiptKey = "workspace:move-receipt:" + details.token;
        const receipt = await target.meta.get(receiptKey);
        const applied = new Set<string>(receipt ? (JSON.parse(receipt.value) as string[]) : []);
        const queued = new Set((await target.outbox.toArray()).map(outboxKey));
        const additions: Outbox[] = [];
        function add(item: Outbox) {
          const key = outboxKey(item);
          if (!applied.has(key) && !queued.has(key)) additions.push(item);
          applied.add(key);
        }

        // Keep the original operation order, then enqueue any remaining row versions.
        for (const { table, op, payload, createdAt } of outbox)
          add({ table, op, payload, createdAt });

        for (const [name, records] of rows) {
          if (name === "studio_profile") continue;
          const table: Table<Row, string> = target.table(name);
          const previous = await table.bulkGet(records.map(({ key }) => key));
          const updates: Row[] = [];
          for (const [index, { key, record }] of records.entries()) {
            const recordVersion = version(record) || JSON.stringify(record);
            const marker = JSON.stringify([name, key, recordVersion]);
            if (applied.has(marker)) continue;
            applied.add(marker);
            const current = previous[index];
            const keepCurrent = current && time(version(current)) >= time(version(record));
            if (
              current &&
              JSON.stringify({ ...current, syncState: undefined }) !==
                JSON.stringify({ ...record, syncState: undefined })
            ) {
              await archiveConflict(
                target,
                `workspace:row-conflict:${name}:${key}`,
                JSON.stringify(keepCurrent ? record : current),
              );
            }
            if (keepCurrent) continue;
            const syncTable = SYNCABLE.find((table) => table === name);
            if (details.enqueueForSync && syncTable) {
              const pending = { ...record, syncState: "pending" };
              updates.push(pending);
              add({
                table: syncTable,
                op: "upsert",
                payload: { ...pending, id: key },
                createdAt: version(record) || new Date(0).toISOString(),
              });
            } else {
              updates.push(record);
            }
          }
          await table.bulkPut(updates);
        }

        await target.outbox.bulkAdd(additions);
        if (applied.size) {
          await target.meta.put({ key: receiptKey, value: JSON.stringify([...applied]) });
        }
        for (const item of meta) {
          if (PROFILE_KEYS.includes(item.key)) continue;
          const current = await target.meta.get(item.key);
          if (
            !current ||
            (item.key.startsWith(DELETION_PREFIX) && time(item.value) > time(current.value))
          ) {
            await target.meta.put(item);
          } else if (current.value !== item.value && !item.key.startsWith(DELETION_PREFIX)) {
            await archiveConflict(target, "workspace:meta-conflict:" + item.key, item.value);
          }
        }

        const storedProfile = rows.get("studio_profile")?.[0]?.record;
        const legacy = meta.filter(({ key, value }) => value && key.startsWith("professional:"));
        const profile = storedProfile
          ? { ...DEFAULT_STUDIO_PROFILE, ...storedProfile }
          : legacy.length
            ? {
                ...DEFAULT_STUDIO_PROFILE,
                fullName: legacy.find(({ key }) => key === PROFILE_KEYS[0])?.value ?? "",
                capNumber: legacy.find(({ key }) => key === PROFILE_KEYS[1])?.value ?? "",
              }
            : null;
        const currentProfile = await target.studio_profile.get("default");
        const keepProfile =
          currentProfile && (!profile || time(currentProfile.updatedAt) >= time(profile.updatedAt));
        if (
          profile &&
          currentProfile &&
          JSON.stringify(profile) !== JSON.stringify(currentProfile)
        ) {
          await archiveConflict(
            target,
            "workspace:row-conflict:studio_profile:default",
            JSON.stringify(keepProfile ? profile : currentProfile),
          );
        }
        if (profile && !keepProfile) {
          await target.studio_profile.put(profile);
          await target.meta.bulkPut([
            { key: PROFILE_KEYS[0], value: profile.fullName },
            { key: PROFILE_KEYS[1], value: profile.capNumber },
          ]);
          const dirty = meta.find(({ key }) => key === PROFILE_DIRTY);
          if (dirty || details.enqueueForSync) {
            await target.meta.put(
              dirty ?? {
                key: PROFILE_DIRTY,
                value: profile.updatedAt || new Date(0).toISOString(),
              },
            );
          } else {
            await target.meta.delete(PROFILE_DIRTY);
          }
        }

        for (const { base, value } of storageEntries) {
          const key = workspaceStorageKey(base, ownerId);
          const existing = window.localStorage.getItem(key);
          if (existing === null || existing === value) continue;
          // A draft or checklist has no reliable ordering. Preserve both versions.
          // Include the active copy as well in case another tab changes it before cleanup.
          const archiveKey = "workspace:storage-conflict:" + base;
          await archiveConflict(target, archiveKey, existing);
          await archiveConflict(target, archiveKey, value);
          conflicts.add(base);
        }
        await target.meta.put({ key: WORKSPACE_OWNER, value: ownerId });
      }),
    );

    // A storage failure aborts source cleanup. Copy every key before removing any.
    for (const { base, value } of storageEntries) {
      if (conflicts.has(base)) continue;
      const key = workspaceStorageKey(base, ownerId);
      const current = window.localStorage.getItem(key);
      if (current === null) window.localStorage.setItem(key, value);
      if (window.localStorage.getItem(key) !== value) {
        throw new Error("Cambió el destino de un borrador durante el traslado.");
      }
    }
    for (const { key, value } of storageEntries) {
      if (window.localStorage.getItem(key) === value) window.localStorage.removeItem(key);
    }

    await Promise.all(USER_TABLES.map((name) => source.table(name).clear()));
    await source.outbox.clear();
    await source.meta.bulkDelete([...meta.map(({ key }) => key), SYNC_OWNER, MOVING, MOVE_DETAILS]);
  });
}

export interface GuestData {
  projects: number;
  quotes: number;
  visits: number;
  hasData: boolean;
}

const countLabel = (count: number, one: string, many: string) =>
  count + " " + (count === 1 ? one : many);

/**
 * What the guest space holds, naming only what exists. Recent cards, assistant
 * history or the studio profile alone are described generically, never as
 * "0 proyectos, 0 cotizaciones y 0 visitas".
 */
export function describeGuestData({ projects, quotes, visits }: GuestData): string {
  const parts = [
    projects && countLabel(projects, "proyecto", "proyectos"),
    quotes && countLabel(quotes, "cotización", "cotizaciones"),
    visits && countLabel(visits, "visita de obra", "visitas de obra"),
  ].filter((part): part is string => Boolean(part));
  if (!parts.length) {
    return "Hay datos guardados sin cuenta en este dispositivo (fichas recientes, historial del asistente o perfil del estudio).";
  }
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(", ") + " y " + parts.at(-1);
  // Phrased so the list never has to agree in gender or number with a participle.
  return `Sin cuenta, en este dispositivo hay: ${list}.`;
}

async function readGuestData(guest: TrazzoDB): Promise<GuestData> {
  const [projects, takeoffs, quotes, notes, photos, visits, links, library, profile] =
    await Promise.all(USER_TABLES.map((name) => guest.table(name).count()));
  const hasData = Boolean(
    projects ||
    quotes ||
    visits ||
    takeoffs ||
    notes ||
    photos ||
    links ||
    library ||
    profile ||
    (await guest.outbox.count()) ||
    (await guest.meta.filter(userMeta).count()),
  );
  let hasStoredData = false;
  try {
    hasStoredData = workspaceStorageEntries(GUEST_WORKSPACE).length > 0;
  } catch {
    // Discovery is best effort. A move still requires storage to be readable.
  }
  return { projects, quotes, visits, hasData: hasData || hasStoredData };
}

async function moveGuest(guest: TrazzoDB, ownerId: string, enqueueForSync: boolean) {
  const target = new TrazzoDB(workspaceDbName(ownerId));
  try {
    await moveWorkspaceData(guest, target, { ownerId, enqueueForSync });
  } finally {
    target.close();
  }
}

async function parkOwnedGuestData(guest: TrazzoDB): Promise<string | null> {
  const [pending, owner] = await Promise.all([guest.meta.get(MOVING), guest.meta.get(SYNC_OWNER)]);
  const targetId = pending?.value ?? owner?.value;
  if (targetId === undefined) return null;
  if (!isAccountWorkspaceId(targetId))
    throw new Error("No se pudo identificar la cuenta de los datos locales.");
  await moveGuest(guest, targetId, !owner);
  return targetId;
}

export async function prepareGuestWorkspace(): Promise<void> {
  const guest = new TrazzoDB();
  try {
    await parkOwnedGuestData(guest);
  } finally {
    guest.close();
  }
}

export async function reconcileGuestOnSignIn(userId: string) {
  const guest = new TrazzoDB();
  const account = new TrazzoDB(workspaceDbName(userId));
  try {
    const owner = await parkOwnedGuestData(guest);
    const data = await readGuestData(guest);
    const choice = await account.meta.get(GUEST_CHOICE);
    return {
      data,
      offer: data.hasData && !choice,
      foundOtherAccount: owner !== null && owner !== userId,
    };
  } finally {
    guest.close();
    account.close();
  }
}

export async function chooseGuestData(userId: string, choice: "keep" | "move"): Promise<GuestData> {
  const guest = new TrazzoDB();
  const account = new TrazzoDB(workspaceDbName(userId));
  try {
    await parkOwnedGuestData(guest);
    if (choice === "move" && (await readGuestData(guest)).hasData) {
      await moveWorkspaceData(guest, account, { ownerId: userId, enqueueForSync: true });
    }
    await account.meta.put({ key: GUEST_CHOICE, value: choice });
    return await readGuestData(guest);
  } finally {
    guest.close();
    account.close();
  }
}
