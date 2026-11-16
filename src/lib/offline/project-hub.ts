import { useLiveQuery } from "dexie-react-hooks";
import type { ResultSheet } from "@/lib/share/result-sheet";
import { createLocalUuid, db, type FeeQuote, type ProjectNote, type ProjectPhoto } from "./db";

/**
 * The project as the hub of the work: calculator results and fee quotes can be
 * filed under a project next to its takeoffs. These links live on this device.
 */
export async function saveProjectNote(projectId: string, sheet: ResultSheet): Promise<ProjectNote> {
  if (!db) throw new Error("La base local no está disponible.");
  const note: ProjectNote = {
    id: createLocalUuid(),
    projectId,
    eyebrow: sheet.eyebrow,
    title: sheet.title,
    subtitle: sheet.subtitle,
    rows: sheet.rows,
    notes: sheet.notes,
    createdAt: new Date().toISOString(),
  };
  await db.project_notes.put(note);
  return note;
}

export async function deleteProjectNote(id: string): Promise<void> {
  await db?.project_notes.delete(id);
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
  if (!db) return { ok: false, error: "La base local no está disponible." };
  const count = await db.project_photos.where("projectId").equals(projectId).count();
  if (count >= MAX_PROJECT_PHOTOS) {
    return {
      ok: false,
      error:
        "Este proyecto ya tiene " + MAX_PROJECT_PHOTOS + " fotos. Quita alguna para añadir más.",
    };
  }
  await db.project_photos.put({
    id: createLocalUuid(),
    projectId,
    dataUrl,
    caption: "",
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function updateProjectPhotoCaption(id: string, caption: string): Promise<void> {
  await db?.project_photos.update(id, { caption });
}

export async function deleteProjectPhoto(id: string): Promise<void> {
  await db?.project_photos.delete(id);
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
