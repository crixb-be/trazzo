import "fake-indexeddb/auto";
import Dexie from "dexie";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestSession = { user: { id: string }; access_token: string } | null;
const auth = vi.hoisted(() => ({
  session: null as TestSession,
  onChange: undefined as ((event: string, session: TestSession) => void) | undefined,
  fetch: vi.fn<typeof fetch>(),
  configured: true,
}));

vi.mock("./db", async (load) => {
  const actual = await load<typeof import("./db")>();
  return { ...actual, db: new actual.TrazzoDB() };
});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () =>
    auth.configured
      ? {
          auth: {
            getSession: async () => ({ data: { session: auth.session }, error: null }),
            onAuthStateChange: (callback: typeof auth.onChange) => {
              auth.onChange = callback;
              return {
                data: {
                  subscription: {
                    unsubscribe: () => {
                      auth.onChange = undefined;
                    },
                  },
                },
              };
            },
          },
        }
      : null,
  createSyncClient: (accessToken: string) =>
    createSupabase("https://cloud.example.test", "test-key", {
      accessToken: async () => accessToken,
      global: { fetch: auth.fetch },
    }),
}));
vi.mock("@/lib/plans/plan-store", () => ({
  loadPlanSnapshot: async () => ({ plan: "free" }),
}));

import { db } from "./db";
import {
  saveProject,
  deleteProject,
  deleteTakeoff,
  saveTakeoff,
  StaleTakeoffError,
} from "./repositories";
import { BACKUP_FORMAT, importBackup, parseBackup } from "./backup";
import {
  addProjectPhoto,
  deleteProjectNote,
  saveProjectNote,
  updateProjectPhotoCaption,
} from "./project-hub";
import { deleteSiteLog, saveSiteLog } from "./site-logs";
import { getSyncActivity, getSyncStatus, startOnlineSync, syncNow } from "./sync";

type CloudRow = Record<string, unknown> & { id: string; updated_at: string };
const database = db!;
let cloud: Map<string, Map<string, CloudRow>>;
let failNextWrite: boolean;
let connection: { onLine: boolean };
let page: EventTarget & { visibilityState: string };
let stop: () => void;

function table(name: string): Map<string, CloudRow> {
  if (!cloud.has(name)) cloud.set(name, new Map());
  return cloud.get(name)!;
}

function signIn(id = "owner") {
  auth.session = { user: { id }, access_token: "session-" + id };
  auth.onChange?.("SIGNED_IN", auth.session);
}

const draft = {
  name: "Obra en campo",
  location: "Lima",
  typology: "Vivienda",
  status: "activo",
} as const;

beforeEach(async () => {
  await database.open();
  cloud = new Map();
  failNextWrite = false;
  connection = { onLine: false };
  page = Object.assign(new EventTarget(), { visibilityState: "hidden" });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", connection);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  auth.session = null;
  auth.configured = true;
  auth.fetch.mockReset().mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const rows = table(url.pathname.split("/").at(-1)!);
    const condition = url.searchParams.get("id");
    if (init?.method === "POST" || init?.method === "PATCH") {
      if (failNextWrite) {
        failNextWrite = false;
        return Response.json({ message: "Sin conexión temporal" }, { status: 503 });
      }
      const patch = JSON.parse(String(init.body)) as CloudRow;
      const id = patch.id ?? condition?.slice(3);
      if (!id) return Response.json({ message: "Falta el identificador" }, { status: 400 });
      const old = rows.get(id);
      if (
        (old || init.method === "POST") &&
        (!old || Date.parse(old.updated_at) < Date.parse(patch.updated_at))
      ) {
        rows.set(id, { ...old, ...patch, id });
      }
      return new Response(null, { status: 204 });
    }
    const records = [...rows.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((row) => {
        if (condition?.startsWith("gt.")) return row.id > condition.slice(3);
        if (condition?.startsWith("in.")) return condition.slice(4, -1).split(",").includes(row.id);
        return true;
      });
    return Response.json(records.slice(0, Number(url.searchParams.get("limit") ?? 1000)));
  });
  stop = startOnlineSync();
});

afterEach(async () => {
  stop();
  vi.clearAllTimers();
  vi.useRealTimers();
  await database.delete();
  vi.unstubAllGlobals();
});

async function waitUntilBackedUp() {
  await vi.waitFor(async () => {
    expect(await database.outbox.count()).toBe(0);
    expect(getSyncActivity().syncing).toBe(false);
    expect((await getSyncStatus()).error).toBeNull();
    expect((await getSyncStatus()).lastSync).not.toBeNull();
  });
}

describe("sincronización con datos de campo", () => {
  it("encola cálculos y fotos de la base anterior al actualizar Dexie", async () => {
    await database.delete();
    const old = new Dexie("TrazzoDB");
    old.version(7).stores({
      projects: "id,updatedAt,syncState",
      takeoffs: "id,projectId,updatedAt,syncState",
      fee_quotes: "id,code,updatedAt,syncState",
      project_notes: "id,projectId,createdAt",
      project_photos: "id,projectId,createdAt",
      project_options: "projectId",
      outbox: "++id,table,createdAt",
    });
    const createdAt = "2026-11-17T13:00:00.000Z";
    try {
      await old.table("project_notes").put({ id: "note", projectId: "site", createdAt });
      await old.table("project_photos").put({ id: "photo", projectId: "site", createdAt });
    } finally {
      old.close();
    }
    await database.open();
    expect(await database.outbox.toArray()).toMatchObject([
      { table: "project_notes", op: "upsert", payload: { id: "note" }, createdAt },
      { table: "project_photos", op: "upsert", payload: { id: "photo" }, createdAt },
    ]);
  });

  it("encola sin conexión y reintenta automáticamente al fallar la primera subida", async () => {
    signIn();
    const project = await saveProject(draft);
    const note = await saveProjectNote(project.id, {
      kind: "calculo",
      eyebrow: "RNE",
      title: "Pendiente",
      subtitle: "",
      rows: [],
      notes: [],
      disclaimer: "",
    });
    await addProjectPhoto(project.id, "data:image/jpeg;base64,AA==");
    const [photo] = await database.project_photos.toArray();
    await updateProjectPhotoCaption(photo.id, "Frente de obra");
    expect(await database.outbox.count()).toBe(4);
    expect(auth.fetch).not.toHaveBeenCalled();

    failNextWrite = true;
    connection.onLine = true;
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(async () => {
      expect((await getSyncStatus()).error).toBe("Sin conexión temporal");
      expect(getSyncActivity().syncing).toBe(false);
    });
    expect(await database.outbox.count()).toBe(4);
    expect(await database.projects.get(project.id)).toMatchObject({ name: draft.name });

    await vi.advanceTimersByTimeAsync(2_500);
    await waitUntilBackedUp();
    expect(table("projects").get(project.id)).toMatchObject({ name: draft.name, user_id: "owner" });
    expect(table("project_records").get(note.id)).toMatchObject({ kind: "note" });
    expect(table("project_records").get(photo.id)).toMatchObject({
      kind: "photo",
      data: { caption: "Frente de obra" },
    });

    await deleteProjectNote(note.id);
    await syncNow();
    expect(table("project_records").get(note.id)).toMatchObject({
      deleted_at: expect.any(String),
      data: {},
    });
    expect(await database.project_notes.get(note.id)).toBeUndefined();
  });

  it("reconcilia ediciones y borrados contra la versión más reciente", async () => {
    signIn();
    const project = await saveProject(draft);
    connection.onLine = true;
    const newer = new Date(Date.parse(project.updatedAt) + 1).toISOString();
    table("projects").set(project.id, {
      id: project.id,
      name: "Edición en la nube",
      updated_at: newer,
    });
    await syncNow();
    expect(await database.projects.get(project.id)).toMatchObject({ name: "Edición en la nube" });

    const latest = await saveProject({ ...draft, id: project.id, name: "Edición en obra" });
    await syncNow();
    expect(table("projects").get(project.id)).toMatchObject({
      name: latest.name,
      updated_at: latest.updatedAt,
    });

    await deleteProject(project.id);
    await syncNow();
    expect(table("projects").get(project.id)).toMatchObject({ deleted_at: expect.any(String) });
    expect(await database.projects.get(project.id)).toBeUndefined();

    // Another tab can finish a download it started before the deletion.
    table("projects").set(project.id, {
      id: project.id,
      name: latest.name,
      updated_at: latest.updatedAt,
      deleted_at: null,
    });
    await syncNow();
    expect(await database.projects.get(project.id)).toBeUndefined();
  });

  it("protege ediciones de bitácora pendientes y aplica tombstones de visitas independientes", async () => {
    signIn();
    const project = await saveProject(draft);
    const log = await saveSiteLog({
      projectId: project.id,
      visitType: "visita",
      visitDate: "2026-11-20",
      attendees: "",
      workStatus: "",
      findings: "Original",
      orders: "",
      followUp: "",
      topics: [],
      photos: [],
    });
    connection.onLine = true;
    expect((await syncNow()).status).toBe("ok");
    const remote = table("site_logs").get(log.id)!;
    expect(remote).toMatchObject({
      user_id: "owner",
      project_id: project.id,
      data: { findings: "Original" },
    });
    await deleteProject(project.id);
    expect((await syncNow()).status).toBe("ok");
    expect(await database.site_logs.get(log.id)).toMatchObject({ syncState: "synced" });

    const edit = await saveSiteLog({ ...log, findings: "Pendiente" });
    failNextWrite = true;
    table("site_logs").set(log.id, {
      ...remote,
      data: { ...log, findings: "Edición remota" },
      updated_at: new Date(Date.parse(edit.updatedAt) + 5).toISOString(),
    });
    expect((await syncNow()).status).toBe("partial");
    expect(await database.site_logs.get(log.id)).toMatchObject({ findings: "Pendiente" });
    expect((await syncNow()).status).toBe("ok");
    expect(await database.site_logs.get(log.id)).toMatchObject({ findings: "Edición remota" });

    const stale = table("site_logs").get(log.id)!;
    await deleteSiteLog(log.id);
    expect((await syncNow()).status).toBe("ok");
    expect(table("site_logs").get(log.id)).toMatchObject({
      deleted_at: expect.any(String),
      data: {},
    });
    table("site_logs").set(log.id, stale);
    await syncNow();
    expect(await database.site_logs.get(log.id)).toBeUndefined();
  });

  it("sincroniza al iniciar sesión o volver al primer plano y protege la cuenta original", async () => {
    connection.onLine = true;
    const project = await saveProject(draft);
    expect((await syncNow()).status).toBe("signed-out");
    expect(await database.outbox.count()).toBe(1);

    signIn();
    await waitUntilBackedUp();
    const remote = table("projects").get(project.id)!;
    table("projects").set(project.id, {
      ...remote,
      name: "Cambio remoto",
      updated_at: new Date(Date.parse(remote.updated_at) + 1).toISOString(),
    });
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(async () =>
      expect(await database.projects.get(project.id)).toMatchObject({ name: "Cambio remoto" }),
    );
    await waitUntilBackedUp();

    signIn("another-account");
    await saveProject({ ...draft, id: project.id, name: "Edición privada" });
    expect((await syncNow()).status).toBe("account-mismatch");
    expect(await database.outbox.count()).toBe(1);
    expect(table("projects").get(project.id)?.name).toBe("Cambio remoto");

    auth.configured = false;
    expect((await syncNow()).status).toBe("not-configured");
    expect(await database.projects.get(project.id)).toMatchObject({ name: "Edición privada" });
  });
});

describe("project details and takeoff edits", () => {
  it("upgrades a v9 database and queues only migrated positive areas", async () => {
    await database.delete();
    const old = new Dexie("TrazzoDB");
    old.version(9).stores({
      projects: "id,updatedAt,syncState",
      project_options: "projectId",
      outbox: "++id,table,createdAt",
    });
    const updatedAt = "2026-11-01T12:00:00.000Z";
    await old.table("projects").bulkPut(
      ["migrated", "empty", "missing"].map((id) => ({
        ...draft,
        id,
        updatedAt,
        syncState: "synced",
      })),
    );
    await old.table("project_options").bulkPut([
      { projectId: "migrated", area: 120.5 },
      { projectId: "empty", area: 0 },
      { projectId: "orphan", area: 73 },
    ]);
    old.close();

    await database.open();
    const row = await database.projects.get("migrated");
    expect(row).toMatchObject({ client: "", builtArea: 120.5, syncState: "pending" });
    expect(row!.updatedAt > updatedAt).toBe(true);
    for (const id of ["empty", "missing"]) {
      expect(await database.projects.get(id)).toMatchObject({
        client: "",
        builtArea: null,
        updatedAt,
        syncState: "synced",
      });
    }
    expect(await database.outbox.toArray()).toMatchObject([
      { table: "projects", op: "upsert", payload: row, createdAt: row!.updatedAt },
    ]);
    expect(database.tables.map((table) => table.name)).not.toContain("project_options");
  });

  it("imports legacy backup options into the project and its outbox row", async () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        projects: [{ ...draft, id: "legacy" }],
        projectOptions: [{ projectId: "legacy", area: 115 }],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(await importBackup(parsed.backup, "free")).toEqual({ ok: true });
    expect(await database.projects.get("legacy")).toMatchObject({ client: "", builtArea: 115 });
    expect(await database.outbox.toArray()).toMatchObject([
      { table: "projects", op: "upsert", payload: { id: "legacy", builtArea: 115 } },
    ]);
  });

  it("rejects edits from a different project and edits to deleted takeoffs", async () => {
    const project = await saveProject(draft);
    const other = await saveProject({ ...draft, name: "Otra obra" });
    const line = await saveTakeoff({
      projectId: project.id,
      partName: "Muro",
      materialCode: "cemento",
      length: 1,
      width: 1,
      height: 0,
      quantity: 1,
      total: 1,
      wastePct: 0,
      unitPricePen: 0,
      subtotalPen: 0,
    });
    await expect(saveTakeoff({ ...line, projectId: other.id })).rejects.toBeInstanceOf(
      StaleTakeoffError,
    );
    expect(await database.takeoffs.get(line.id)).toEqual(line);

    await deleteTakeoff(line.id);
    const count = await database.outbox.count();
    await expect(saveTakeoff(line)).rejects.toBeInstanceOf(StaleTakeoffError);
    expect(await database.takeoffs.get(line.id)).toBeUndefined();
    expect(await database.outbox.count()).toBe(count);
  });

  it("retries an older PostgREST schema once per session without discarding local details", async () => {
    const handle = auth.fetch.getMockImplementation()!;
    const payloads: CloudRow[] = [];
    auth.fetch.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname.endsWith("/projects") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as CloudRow;
        payloads.push(payload);
        if ("built_area" in payload || "client" in payload) {
          return Response.json({ code: "PGRST204", message: "Column not found" }, { status: 400 });
        }
      }
      return handle(input, init);
    });
    signIn();
    const project = await saveProject({ ...draft, client: "Cliente", builtArea: 120 });
    const second = await saveProject({ ...draft, name: "Otro", client: "Otro cliente" });
    connection.onLine = true;
    expect(await syncNow()).toMatchObject({ status: "ok" });
    expect(payloads).toHaveLength(3);
    expect(payloads[0]).toMatchObject({ id: project.id, client: "Cliente", built_area: 120 });
    expect(payloads[1]).toMatchObject({ id: project.id });
    expect(payloads[2]).toMatchObject({ id: second.id });
    for (const payload of payloads.slice(1)) {
      expect(payload).not.toHaveProperty("client");
      expect(payload).not.toHaveProperty("built_area");
    }
    expect(await database.projects.get(project.id)).toMatchObject({
      client: "Cliente",
      builtArea: 120,
    });
  });
});
