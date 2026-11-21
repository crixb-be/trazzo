import { useLiveQuery } from "dexie-react-hooks";
import {
  MAX_SITE_LOG_PHOTOS,
  SITE_LOG_PHOTO_LIMIT,
  siteLogSchema,
  siteVisitDate,
} from "@/lib/projects/site-log";
import { createLocalUuid, db, nextUpdatedAt, type SiteLog } from "./db";
import { enqueue } from "./repositories";
import { scheduleSync } from "./sync";

export type SiteLogDraft = Omit<SiteLog, "id" | "createdAt" | "updatedAt" | "syncState">;

async function writeSiteLog(id: string | undefined, change: (previous?: SiteLog) => SiteLogDraft) {
  const local = db;
  if (!local) throw new Error("La base local no está disponible.");
  const log = await local.transaction("rw", [local.site_logs, local.outbox], async () => {
    const previous = id ? await local.site_logs.get(id) : undefined;
    if (id && !previous) throw new Error("Esta visita ya no está disponible.");
    const draft = change(previous);
    if (!siteVisitDate.safeParse(draft.visitDate).success)
      throw new Error("Ingresa una fecha de visita válida.");
    if (draft.photos.length > MAX_SITE_LOG_PHOTOS) throw new Error(SITE_LOG_PHOTO_LIMIT);
    const updatedAt = nextUpdatedAt(previous?.updatedAt);
    const row: SiteLog = {
      ...draft,
      id: previous?.id ?? createLocalUuid(),
      createdAt: previous?.createdAt ?? updatedAt,
      updatedAt,
      syncState: "pending",
    };
    if (!siteLogSchema.safeParse(row).success)
      throw new Error("Los datos de la visita no son válidos.");
    await local.site_logs.put(row);
    await enqueue("site_logs", "upsert", row, updatedAt);
    return row;
  });
  scheduleSync();
  return log;
}

export function saveSiteLog(input: SiteLogDraft & { id?: string }, expectedVersion?: string) {
  return writeSiteLog(input.id, (previous) => {
    if (expectedVersion && previous?.updatedAt !== expectedVersion) {
      throw new Error(
        "La visita cambió en otro dispositivo o pestaña. Vuelve a abrirla antes de guardar.",
      );
    }
    return input;
  });
}

export async function deleteSiteLog(id: string) {
  const local = db;
  if (!local) return;
  await local.transaction("rw", [local.site_logs, local.outbox], async () => {
    const previous = await local.site_logs.get(id);
    if (!previous) return;
    await local.site_logs.delete(id);
    await enqueue(
      "site_logs",
      "delete",
      { id, projectId: previous.projectId },
      nextUpdatedAt(previous.updatedAt),
    );
  });
  scheduleSync();
}

type PhotoChange = (photos: SiteLog["photos"]) => SiteLog["photos"];

function changePhotos(id: string, change: PhotoChange) {
  return writeSiteLog(id, (previous) => {
    if (!previous) throw new Error("Esta visita ya no está disponible.");
    return { ...previous, photos: change(previous.photos) };
  });
}

export function addSiteLogPhoto(id: string, dataUrl: string, caption = "") {
  return changePhotos(id, (photos) => [
    ...photos,
    {
      id: createLocalUuid(),
      dataUrl,
      caption,
      createdAt: nextUpdatedAt(),
    },
  ]);
}

export function updateSiteLogPhotoCaption(id: string, photoId: string, caption: string) {
  return changePhotos(id, (photos) =>
    photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)),
  );
}

export function removeSiteLogPhoto(id: string, photoId: string) {
  return changePhotos(id, (photos) => photos.filter((photo) => photo.id !== photoId));
}

export function useSiteLogs(projectId?: string) {
  return useLiveQuery(
    async () => {
      if (!db) return [];
      const rows = await (projectId === undefined
        ? db.site_logs.toArray()
        : db.site_logs.where("projectId").equals(projectId).toArray());
      return rows.sort(
        (a, b) => b.visitDate.localeCompare(a.visitDate) || b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    [projectId],
    [],
  );
}

export function useSiteLog(id: string | null) {
  const result = useLiveQuery(
    async () => ({
      id,
      log: id ? ((await db?.site_logs.get(id)) ?? null) : null,
    }),
    [id],
  );
  return result?.id === id ? result.log : undefined;
}
