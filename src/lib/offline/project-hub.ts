import { useLiveQuery } from "dexie-react-hooks";
import type { ResultSheet } from "@/lib/share/result-sheet";
import {
  createLocalUuid,
  db,
  nextUpdatedAt,
  type FeeQuote,
  type ProjectNote,
  type ProjectPhoto,
} from "./db";
import { enqueue } from "./repositories";
import { scheduleSync } from "./sync";

/**
 * The project as the hub of the work: calculator results and fee quotes can be
 * filed under a project next to its takeoffs.
 */
export async function saveProjectNote(projectId: string, sheet: ResultSheet): Promise<ProjectNote> {
  const local = db;
  if (!local) throw new Error("La base local no está disponible.");
  const now = nextUpdatedAt();
  const note: ProjectNote = {
    id: createLocalUuid(),
    projectId,
    eyebrow: sheet.eyebrow,
    title: sheet.title,
    subtitle: sheet.subtitle,
    rows: sheet.rows,
    notes: sheet.notes,
    createdAt: now,
    updatedAt: now,
    syncState: "pending",
  };
  await local.transaction("rw", [local.project_notes, local.outbox], async () => {
    await local.project_notes.put(note);
    await enqueue("project_notes", "upsert", note, now);
  });
  scheduleSync();
  return note;
}

export async function deleteProjectNote(id: string): Promise<void> {
  await deleteRecord("project_notes", id);
}

export function useProjectNotes(projectId: string): ProjectNote[] {
  return (
    useLiveQuery(
      async () => {
        if (!db || !projectId) return [];
        const notes = await db.project_notes.where("projectId").equals(projectId).toArray();
        return notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      [projectId],
      [],
    ) ?? []
  );
}

/** Files a quote under a project, or removes it from any project with `null`. */
export async function linkQuoteToProject(quoteId: string, projectId: string | null): Promise<void> {
  if (!db) return;
  if (projectId) await db.project_links.put({ quoteId, projectId });
  else await db.project_links.delete(quoteId);
}

export function useQuoteProjectId(quoteId: string | null): string | null {
  return (
    useLiveQuery(
      async () => {
        if (!db || !quoteId) return null;
        return (await db.project_links.get(quoteId))?.projectId ?? null;
      },
      [quoteId],
      null,
    ) ?? null
  );
}

export function useProjectQuotes(projectId: string): FeeQuote[] {
  return (
    useLiveQuery(
      async () => {
        if (!db || !projectId) return [];
        const links = await db.project_links.where("projectId").equals(projectId).toArray();
        const quotes = await db.fee_quotes.bulkGet(links.map((link) => link.quoteId));
        return quotes.filter((quote): quote is FeeQuote => Boolean(quote));
      },
      [projectId],
      [],
    ) ?? []
  );
}

/** Photos per project are capped so the device storage does not fill up unnoticed. */
export const MAX_PROJECT_PHOTOS = 30;

export async function addProjectPhoto(
  projectId: string,
  dataUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const local = db;
  if (!local) return { ok: false, error: "La base local no está disponible." };
  const added = await local.transaction("rw", [local.project_photos, local.outbox], async () => {
    const count = await local.project_photos.where("projectId").equals(projectId).count();
    if (count >= MAX_PROJECT_PHOTOS) return false;
    const now = nextUpdatedAt();
    const photo: ProjectPhoto = {
      id: createLocalUuid(),
      projectId,
      dataUrl,
      caption: "",
      createdAt: now,
      updatedAt: now,
      syncState: "pending",
    };
    await local.project_photos.put(photo);
    await enqueue("project_photos", "upsert", photo, now);
    return true;
  });
  if (!added)
    return {
      ok: false,
      error:
        "Este proyecto ya tiene " + MAX_PROJECT_PHOTOS + " fotos. Quita alguna para añadir más.",
    };
  scheduleSync();
  return { ok: true };
}

export async function updateProjectPhotoCaption(id: string, caption: string): Promise<void> {
  const local = db;
  if (!local) return;
  await local.transaction("rw", [local.project_photos, local.outbox], async () => {
    const previous = await local.project_photos.get(id);
    if (!previous || previous.caption === caption) return;
    const updatedAt = nextUpdatedAt(previous.updatedAt ?? previous.createdAt);
    const photo: ProjectPhoto = { ...previous, caption, updatedAt, syncState: "pending" };
    await local.project_photos.put(photo);
    await enqueue("project_photos", "upsert", photo, updatedAt);
  });
  scheduleSync();
}

export async function deleteProjectPhoto(id: string): Promise<void> {
  await deleteRecord("project_photos", id);
}

async function deleteRecord(table: "project_notes" | "project_photos", id: string): Promise<void> {
  const local = db;
  if (!local) return;
  const records = local[table];
  await local.transaction("rw", [records, local.outbox], async () => {
    const record = await records.get(id);
    if (!record) return;
    await records.delete(id);
    await enqueue(table, "delete", { id }, nextUpdatedAt(record.updatedAt ?? record.createdAt));
  });
  scheduleSync();
}

export function useProjectPhotos(projectId: string): ProjectPhoto[] {
  return (
    useLiveQuery(
      async () => {
        if (!db || !projectId) return [];
        const photos = await db.project_photos.where("projectId").equals(projectId).toArray();
        return photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      [projectId],
      [],
    ) ?? []
  );
}
