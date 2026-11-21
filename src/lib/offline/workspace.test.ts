import Dexie from "dexie";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siteLogDraftKey } from "@/lib/projects/site-log-drafts";
import { db, type Project, TrazzoDB } from "./db";
import { deleteLocalCopy } from "./delete-local-copy";
import { DEFAULT_STUDIO_PROFILE } from "./profile";
import { DELETION_PREFIX, SYNC_OWNER } from "./sync-keys";
import {
  chooseGuestData,
  describeGuestData,
  moveWorkspaceData,
  reconcileGuestOnSignIn,
} from "./workspace-migration";
import {
  activateWorkspace,
  getActiveDatabase,
  GUEST_WORKSPACE,
  readLastWorkspaceId,
  subscribeWorkspace,
  workspaceDbName,
} from "./workspace";
import { EXPEDIENTE_CHECKLIST_KEY, workspaceStorageKey } from "./workspace-storage";

vi.hoisted(() => vi.stubGlobal("window", {}));

const user = "10000000-0000-4000-a000-000000000001";
const other = "20000000-0000-4000-a000-000000000002";
const guest = GUEST_WORKSPACE;
const older = "2026-10-01T10:00:00.000Z";
const newer = "2026-11-01T10:00:00.000Z";
const project: Project = {
  id: "project",
  name: "Obra",
  location: "Lima",
  typology: "Vivienda",
  client: "",
  builtArea: null,
  status: "activo",
  updatedAt: older,
  syncState: "synced",
};
const ids = [guest, user, other];
let source: TrazzoDB;
let target: TrazzoDB;
let storage: Storage;

beforeEach(async () => {
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  const entries = new Map<string, string>();
  storage = {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
  };
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  await activateWorkspace(guest);
  source = new TrazzoDB();
  target = new TrazzoDB(workspaceDbName(user));
});

afterEach(async () => {
  source.close();
  target.close();
  await activateWorkspace(guest);
  getActiveDatabase().close();
  for (const id of ids) await Dexie.delete(workspaceDbName(id));
  vi.unstubAllGlobals();
});

describe("local workspaces", () => {
  it("preserves the original guest name and uses a validated account name", () => {
    expect(workspaceDbName(guest)).toBe("TrazzoDB");
    expect(workspaceDbName(user)).toBe("TrazzoDB-u-" + user);
    expect(() => workspaceDbName("ambiguous")).toThrow();
    storage.setItem("trazzo-workspace", "ambiguous");
    expect(readLastWorkspaceId()).toBe(guest);
  });

  it("rebinds proxy methods and tables, seeds the account, and hides its data after sign-out", async () => {
    const changed = vi.fn();
    const stop = subscribeWorkspace(changed);
    try {
      const local = db!;
      await local.projects.put({ ...project, name: "Invitado" });
      const previous = getActiveDatabase();
      await activateWorkspace(user);
      expect(previous.isOpen()).toBe(false);
      expect(local.name).toBe(workspaceDbName(user));
      expect(readLastWorkspaceId()).toBe(user);
      expect(await local.rneCards.count()).toBeGreaterThan(0);
      expect(await local.materials.count()).toBeGreaterThan(0);
      const transaction = local.transaction;
      await transaction("rw", [local.projects, local.meta], async () => {
        await local.projects.put(project);
        await local.meta.put({ key: "assistant-history", value: "private" });
      });
      await activateWorkspace(guest);
      expect(local.name).toBe("TrazzoDB");
      expect(await local.projects.get(project.id)).toMatchObject({ name: "Invitado" });
      expect(await local.meta.get("assistant-history")).toBeUndefined();
      expect(await target.projects.get(project.id)).toEqual(project);
      expect(changed).toHaveBeenCalledTimes(2);
    } finally {
      stop();
    }
  });

  it("deletes a local copy only after confirmation, offering to sync and recounting first", async () => {
    await activateWorkspace(user);
    const local = getActiveDatabase();
    await local.projects.put(project);
    await local.outbox.add({ table: "projects", op: "upsert", payload: project, createdAt: older });
    storage.setItem(workspaceStorageKey(EXPEDIENTE_CHECKLIST_KEY), "account");
    storage.setItem(EXPEDIENTE_CHECKLIST_KEY, "guest");
    const signOut = vi.fn(async () => undefined);
    const confirm = vi
      .fn<(count: number) => Promise<boolean | "alternate">>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce("alternate")
      .mockResolvedValueOnce(true);
    const sync = vi.fn(async () => {
      await local.outbox.clear();
    });
    expect(await deleteLocalCopy(user, { confirm, sync, signOut })).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(await local.projects.get(project.id)).toEqual(project);
    expect(await deleteLocalCopy(user, { confirm, sync, signOut })).toBe(true);
    expect(confirm.mock.calls).toEqual([[1], [1], [0]]);
    expect(sync).toHaveBeenCalledOnce();
    expect(db?.name).toBe(workspaceDbName(guest));
    expect(await Dexie.exists(workspaceDbName(user))).toBe(false);
    expect(storage.getItem(workspaceStorageKey(EXPEDIENTE_CHECKLIST_KEY, user))).toBeNull();
    expect(storage.getItem(EXPEDIENTE_CHECKLIST_KEY)).toBe("guest");
  });
});

describe("guest reconciliation", () => {
  it.each([user, other])("parks legacy data with its owner %s", async (owner) => {
    await source.projects.put(project);
    await source.meta.put({ key: SYNC_OWNER, value: owner });
    const result = await reconcileGuestOnSignIn(user);
    expect(result).toMatchObject({
      offer: false,
      foundOtherAccount: owner === other,
      data: { hasData: false },
    });
    expect(await source.projects.count()).toBe(0);
    const destination = new TrazzoDB(workspaceDbName(owner));
    try {
      expect(await destination.projects.get(project.id)).toEqual(project);
    } finally {
      destination.close();
    }
    if (owner === other) expect(await target.projects.count()).toBe(0);
  });

  it("offers unowned data, remembers keep per account, and later allows an explicit move over plan limits", async () => {
    await source.projects.bulkPut([project, { ...project, id: "other-project" }]);
    expect(await reconcileGuestOnSignIn(user)).toMatchObject({
      offer: true,
      data: { projects: 2, quotes: 0, visits: 0 },
    });
    expect(await source.projects.count()).toBe(2);
    expect(await target.projects.count()).toBe(0);
    await chooseGuestData(user, "keep");
    expect(await reconcileGuestOnSignIn(user)).toMatchObject({
      offer: false,
      data: { hasData: true },
    });
    expect(await reconcileGuestOnSignIn(other)).toMatchObject({ offer: true });
    await chooseGuestData(user, "move");
    expect(await source.projects.count()).toBe(0);
    expect(await target.projects.toArray()).toEqual([
      { ...project, id: "other-project", syncState: "pending" },
      { ...project, syncState: "pending" },
    ]);
    expect(await target.outbox.count()).toBe(2);
    expect(await reconcileGuestOnSignIn(user)).toMatchObject({
      offer: false,
      data: { hasData: false },
    });
  });

  it("does not offer an empty guest catalogue", async () => {
    expect(await reconcileGuestOnSignIn(user)).toMatchObject({
      offer: false,
      foundOtherAccount: false,
      data: { hasData: false },
    });
  });
});

describe("workspace migration", () => {
  it("moves user data and merges newer versions while leaving both catalogues and device metadata alone", async () => {
    const deletionKey = DELETION_PREFIX + "projects:deleted";
    const records = {
      projects: [project, { ...project, id: "unique" }],
      takeoffs: [{ id: "takeoff", projectId: project.id, updatedAt: older }],
      fee_quotes: [{ id: "quote", createdAt: older }],
      project_notes: [{ id: "note", projectId: project.id, createdAt: older }],
      project_photos: [{ id: "photo", projectId: project.id, createdAt: older }],
      project_links: [{ quoteId: "quote", projectId: project.id }],
      site_logs: [{ id: "visit", createdAt: older }],
      library_activity: [{ slug: "library", favorite: true, visitedAt: older }],
      studio_profile: [{ id: "default", fullName: "Profesional", updatedAt: newer }],
    };
    for (const [name, rows] of Object.entries(records)) await source.table(name).bulkPut(rows);
    const untouched = ["seedVersion", "lastSync", "plan:profile"];
    await source.meta.bulkPut([
      ...untouched.map((key) => ({ key, value: "legacy" })),
      { key: SYNC_OWNER, value: user },
      { key: "assistant-history", value: "guest-history" },
      { key: "fees:customRates", value: "guest-rates" },
      { key: deletionKey, value: newer },
    ]);
    await target.meta.bulkPut([
      { key: "assistant-history", value: "account-history" },
      { key: deletionKey, value: older },
    ]);
    await target.projects.put({ ...project, name: "Reciente", updatedAt: newer });
    await target.studio_profile.put({
      ...DEFAULT_STUDIO_PROFILE,
      fullName: "Anterior",
      updatedAt: older,
    });
    const rneCount = await source.rneCards.count();
    const materialCount = await source.materials.count();
    const item = {
      table: "projects",
      op: "delete",
      payload: { id: "deleted" },
      createdAt: newer,
    } as const;
    await source.outbox.add(item);
    await target.outbox.add(item);
    await moveWorkspaceData(source, target, { ownerId: user, enqueueForSync: true });

    for (const [name, rows] of Object.entries(records)) {
      expect(await source.table(name).count()).toBe(0);
      expect(await target.table(name).count()).toBe(rows.length);
    }
    expect(await target.projects.get(project.id)).toMatchObject({
      name: "Reciente",
      updatedAt: newer,
    });
    expect(await target.projects.get("unique")).toMatchObject({ syncState: "pending" });
    expect(await target.project_notes.get("note")).toMatchObject({ syncState: "pending" });
    expect(await target.studio_profile.get("default")).toMatchObject({ fullName: "Profesional" });
    expect(await target.meta.get("assistant-history")).toMatchObject({ value: "account-history" });
    expect(await target.meta.get("fees:customRates")).toMatchObject({ value: "guest-rates" });
    expect(await target.meta.get(deletionKey)).toMatchObject({ value: newer });
    expect(await target.meta.get("workspace:owner")).toMatchObject({ value: user });
    expect(await target.outbox.count()).toBe(7);
    expect(await source.outbox.count()).toBe(0);
    expect(await source.meta.get(SYNC_OWNER)).toBeUndefined();
    for (const key of untouched) {
      expect(await source.meta.get(key)).toBeDefined();
      expect(await target.meta.get(key)).toBeUndefined();
    }
    expect(await source.rneCards.count()).toBe(rneCount);
    expect(await source.materials.count()).toBe(materialCount);
    expect(await target.rneCards.count()).toBe(0);
    expect(await target.materials.count()).toBe(0);
  });

  it.each([false, true])(
    "resumes after target commits and the source rolls back (outbox already sent: %s)",
    async (drained) => {
      await source.projects.put(project);
      await source.outbox.add({
        table: "projects",
        op: "upsert",
        payload: project,
        createdAt: older,
      });
      vi.spyOn(source.outbox, "clear").mockRejectedValueOnce(new Error("simulated crash"));
      await expect(
        moveWorkspaceData(source, target, { ownerId: user, enqueueForSync: true }),
      ).rejects.toThrow("simulated crash");
      expect(await target.projects.get(project.id)).toMatchObject({ syncState: "pending" });
      expect(await target.outbox.count()).toBe(1);
      expect(await source.projects.get(project.id)).toEqual(project);
      expect(await source.meta.get("workspace:moving")).toMatchObject({ value: user });
      if (drained) await target.outbox.clear();
      expect(await reconcileGuestOnSignIn(other)).toMatchObject({
        foundOtherAccount: true,
        offer: false,
      });
      expect(await source.meta.get("workspace:moving")).toBeUndefined();
      expect(await source.projects.count()).toBe(0);
      expect(await target.projects.count()).toBe(1);
      expect(await target.outbox.count()).toBe(drained ? 0 : 1);
    },
  );

  it("moves the legacy keys and preserves both versions when an account draft already exists", async () => {
    const checklist = EXPEDIENTE_CHECKLIST_KEY;
    const draft = siteLogDraftKey(undefined, user);
    const anotherDraft = workspaceStorageKey(draft, other);
    storage.setItem(checklist, "guest-checklist");
    storage.setItem(draft, "guest-draft");
    storage.setItem(anotherDraft, "other-draft");
    storage.setItem(workspaceStorageKey(draft, user), "existing-draft");
    storage.setItem("trazzo-theme", "dark");

    await chooseGuestData(user, "move");
    expect(storage.getItem(checklist)).toBeNull();
    expect(storage.getItem(draft)).toBeNull();
    expect(storage.getItem(anotherDraft)).toBe("other-draft");
    expect(storage.getItem("trazzo-theme")).toBe("dark");
    expect(storage.getItem(workspaceStorageKey(checklist, user))).toBe("guest-checklist");
    await activateWorkspace(user);
    expect(siteLogDraftKey(undefined, user)).toBe(draft + ":" + user);
    expect(storage.getItem(siteLogDraftKey(undefined, user))).toBe("existing-draft");
    expect(
      JSON.parse((await target.meta.get("workspace:storage-conflict:" + draft))!.value),
    ).toEqual(["existing-draft", "guest-draft"]);
  });

  it("does not clear the source if the destination transaction aborts", async () => {
    await source.projects.put(project);
    await target.meta.put({ key: SYNC_OWNER, value: other });
    await expect(
      moveWorkspaceData(source, target, { ownerId: user, enqueueForSync: true }),
    ).rejects.toThrow("otro propietario");
    expect(await source.projects.get(project.id)).toEqual(project);
    expect(await source.meta.get("workspace:moving")).toMatchObject({ value: user });
    expect(await target.projects.count()).toBe(0);
  });

  it("leaves source data and the move marker in place if storage is full", async () => {
    await source.projects.put(project);
    storage.setItem(EXPEDIENTE_CHECKLIST_KEY, "checklist");
    vi.spyOn(storage, "setItem").mockImplementationOnce(() => {
      throw new Error("storage full");
    });
    await expect(
      moveWorkspaceData(source, target, { ownerId: user, enqueueForSync: true }),
    ).rejects.toThrow("storage full");
    expect(storage.getItem(EXPEDIENTE_CHECKLIST_KEY)).toBe("checklist");
    expect(await source.projects.get(project.id)).toEqual(project);
    expect(await source.meta.get("workspace:moving")).toMatchObject({ value: user });
    await reconcileGuestOnSignIn(user);
    expect(storage.getItem(workspaceStorageKey(EXPEDIENTE_CHECKLIST_KEY, user))).toBe("checklist");
    expect(await target.outbox.count()).toBe(1);
  });
});

describe("describeGuestData", () => {
  const data = (projects: number, quotes: number, visits: number) => ({
    projects,
    quotes,
    visits,
    hasData: true,
  });

  it("names only what exists, with correct plurals", () => {
    expect(describeGuestData(data(1, 0, 0))).toBe(
      "Sin cuenta, en este dispositivo hay: 1 proyecto.",
    );
    expect(describeGuestData(data(2, 1, 3))).toBe(
      "Sin cuenta, en este dispositivo hay: 2 proyectos, 1 cotización y 3 visitas de obra.",
    );
    expect(describeGuestData(data(0, 2, 1))).toBe(
      "Sin cuenta, en este dispositivo hay: 2 cotizaciones y 1 visita de obra.",
    );
  });

  it("never says «0 proyectos» when only minor data exists", () => {
    const text = describeGuestData(data(0, 0, 0));
    expect(text).not.toMatch(/\b0\b/);
    expect(text).toMatch(/fichas recientes, historial del asistente o perfil del estudio/);
  });
});
