import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { exportBackup, importBackup, parseBackup } from "./backup";
import { deleteProject, saveProject } from "./repositories";
import {
  addSiteLogPhoto,
  deleteSiteLog,
  removeSiteLogPhoto,
  saveSiteLog,
  updateSiteLogPhotoCaption,
  type SiteLogDraft,
} from "./site-logs";
import { rowToSiteLog, siteLogToRow } from "./sync-mappers";
import { scheduleSync } from "./sync";

vi.mock("./db", async (load) => {
  const actual = await load<typeof import("./db")>();
  return { ...actual, db: new actual.TrazzoDB() };
});
vi.mock("./sync", () => ({ scheduleSync: vi.fn() }));

const database = db!;
const photoUrl = "data:image/jpeg;base64,AA==";
const draft: SiteLogDraft = {
  projectId: null,
  visitType: "visita",
  visitDate: "2026-11-20",
  attendees: "",
  workStatus: "",
  findings: "",
  orders: "",
  followUp: "",
  topics: ["linderos"],
  photos: [],
};

beforeEach(async () => {
  await database.open();
  vi.mocked(scheduleSync).mockClear();
});
afterEach(async () => {
  await database.delete();
});

describe("bitácora local", () => {
  it("guarda, edita y elimina en orden, con versiones en la cola", async () => {
    const created = await saveSiteLog(draft);
    const updated = await saveSiteLog(
      { ...created, findings: "Plomo revisado" },
      created.updatedAt,
    );
    expect(await database.site_logs.get(created.id)).toEqual(updated);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    await expect(
      saveSiteLog({ ...created, orders: "Edición anterior" }, created.updatedAt),
    ).rejects.toThrow(/cambió/);
    await deleteSiteLog(created.id);
    expect(await database.site_logs.get(created.id)).toBeUndefined();
    const queue = await database.outbox.orderBy("id").toArray();
    expect(queue.map(({ table, op }) => [table, op])).toEqual([
      ["site_logs", "upsert"],
      ["site_logs", "upsert"],
      ["site_logs", "delete"],
    ]);
    expect(queue[2].payload).toEqual({ id: created.id, projectId: null });
    expect(queue[2].createdAt > updated.updatedAt).toBe(true);
    expect(scheduleSync).toHaveBeenCalledTimes(3);
  });

  it("revierte la escritura si la cola falla y valida la fecha", async () => {
    await expect(saveSiteLog({ ...draft, visitDate: "2026-02-30" })).rejects.toThrow(/fecha/);
    const enqueue = vi
      .spyOn(database.outbox, "add")
      .mockRejectedValueOnce(new Error("Sin espacio"));
    try {
      await expect(saveSiteLog(draft)).rejects.toThrow("Sin espacio");
      expect(await database.site_logs.count()).toBe(0);
      expect(await database.outbox.count()).toBe(0);
      expect(scheduleSync).not.toHaveBeenCalled();
    } finally {
      enqueue.mockRestore();
    }
  });

  it("aplica el límite de 12 fotos incluso con capturas concurrentes", async () => {
    const log = await saveSiteLog(draft);
    const results = await Promise.allSettled(
      Array.from({ length: 13 }, () => addSiteLogPhoto(log.id, photoUrl)),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(12);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: expect.objectContaining({ message: "Puedes agregar hasta 12 fotos por visita." }),
    });
    const stored = await database.site_logs.get(log.id);
    expect(stored?.photos).toHaveLength(12);
    const photo = stored!.photos[0];
    const edited = await updateSiteLogPhotoCaption(log.id, photo.id, "Muro de prueba");
    expect(edited.photos[0].caption).toBe("Muro de prueba");
    const removed = await removeSiteLogPhoto(log.id, photo.id);
    expect(removed.photos).toHaveLength(11);
    expect(removed.photos.some(({ id }) => id === photo.id)).toBe(false);
    expect(await database.outbox.count()).toBe(15);
  });

  it("conserva las visitas de proyectos eliminados al exportar y restaurar", async () => {
    const project = await saveProject({
      name: "Obra",
      location: "Lima",
      typology: "Vivienda",
      status: "activo",
    });
    const created = await saveSiteLog({ ...draft, projectId: project.id });
    const log = await addSiteLogPhoto(created.id, photoUrl, "Ingreso");
    await deleteProject(project.id);
    const file = await exportBackup();
    expect(file.projects).toEqual([]);
    expect(file.siteLogs).toEqual([log]);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, backup: file });
    if (!parsed.ok) throw new Error(parsed.error);
    await database.site_logs.clear();
    await database.outbox.clear();
    expect(await importBackup(parsed.backup, "free")).toEqual({ ok: true });
    expect(await database.site_logs.get(log.id)).toMatchObject({
      projectId: project.id,
      photos: log.photos,
      syncState: "pending",
    });
    expect(await database.outbox.toArray()).toMatchObject([{ table: "site_logs", op: "upsert" }]);
    const legacy = { ...file, siteLogs: undefined };
    expect(parseBackup(JSON.stringify(legacy))).toMatchObject({
      ok: true,
      backup: { siteLogs: [] },
    });
    expect(
      parseBackup(JSON.stringify({ ...file, siteLogs: [{ id: "incompleto" }] })),
    ).toMatchObject({ ok: false });
  });
});

describe("mapeo de visitas para sincronización", () => {
  it("conserva fotos y temas y usa los campos de control del servidor", async () => {
    const log = await saveSiteLog(draft);
    const photographed = await addSiteLogPhoto(log.id, photoUrl, "Ingreso");
    const row = siteLogToRow(photographed, "owner");
    expect(row).toMatchObject({
      user_id: "owner",
      project_id: null,
      updated_at: photographed.updatedAt,
    });
    expect(
      rowToSiteLog({ ...row, updated_at: photographed.updatedAt.replace("Z", "+00:00") }),
    ).toEqual({ ...photographed, syncState: "synced" });
    expect(rowToSiteLog({ ...row, project_id: 9 })).toBeNull();
    expect(rowToSiteLog({ ...row, data: { ...photographed, photos: [{}] } })).toBeNull();
    expect(rowToSiteLog({ ...row, data: [] })).toBeNull();
  });
});
