import {
  db,
  createLocalUuid,
  nextUpdatedAt,
  type OutboxTable,
  type Project,
  type Takeoff,
} from "./db";
import { scheduleSync } from "./sync";

/** Call inside the same transaction as the mutation. */
export async function enqueue(
  table: OutboxTable,
  op: "upsert" | "delete",
  payload: unknown,
  createdAt = new Date().toISOString(),
): Promise<void> {
  if (!db) return;
  await db.outbox.add({
    table,
    op,
    payload,
    createdAt,
  });
}

export async function saveProject(
  input: Omit<Project, "id" | "updatedAt" | "syncState"> & { id?: string },
): Promise<Project> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const project = await localDb.transaction("rw", [localDb.projects, localDb.outbox], async () => {
    const previous = input.id ? await localDb.projects.get(input.id) : undefined;
    const row: Project = {
      ...input,
      id: input.id ?? createLocalUuid(),
      updatedAt: nextUpdatedAt(previous?.updatedAt),
      syncState: "pending",
    };
    await localDb.projects.put(row);
    await enqueue("projects", "upsert", row, row.updatedAt);
    return row;
  });
  scheduleSync();
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const localDb = db;
  if (!localDb) return;
  await localDb.transaction(
    "rw",
    [
      localDb.projects,
      localDb.takeoffs,
      localDb.outbox,
      localDb.project_notes,
      localDb.project_links,
      localDb.project_options,
      localDb.project_photos,
    ],
    async () => {
      const project = await localDb.projects.get(id);
      if (!project) return;
      await localDb.projects.delete(id);
      // Everything that hangs from the project goes with it; quotes stay, unlinked.
      await localDb.project_notes.where("projectId").equals(id).delete();
      await localDb.project_links.where("projectId").equals(id).delete();
      await localDb.project_options.delete(id);
      await localDb.project_photos.where("projectId").equals(id).delete();
      const takeoffs = await localDb.takeoffs.where("projectId").equals(id).toArray();
      await localDb.takeoffs.bulkDelete(takeoffs.map((takeoff) => takeoff.id));
      await enqueue("projects", "delete", { id }, nextUpdatedAt(project.updatedAt));
    },
  );
  scheduleSync();
}

export async function saveTakeoff(
  input: Omit<Takeoff, "id" | "updatedAt" | "syncState"> & { id?: string },
): Promise<Takeoff> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const takeoff = await localDb.transaction("rw", [localDb.takeoffs, localDb.outbox], async () => {
    const previous = input.id ? await localDb.takeoffs.get(input.id) : undefined;
    const row: Takeoff = {
      ...input,
      id: input.id ?? createLocalUuid(),
      updatedAt: nextUpdatedAt(previous?.updatedAt),
      syncState: "pending",
    };
    await localDb.takeoffs.put(row);
    await enqueue("takeoffs", "upsert", row, row.updatedAt);
    return row;
  });
  scheduleSync();
  return takeoff;
}

export async function deleteTakeoff(id: string): Promise<void> {
  const localDb = db;
  if (!localDb) return;
  await localDb.transaction("rw", [localDb.takeoffs, localDb.outbox], async () => {
    const row = await localDb.takeoffs.get(id);
    if (!row) return;
    await localDb.takeoffs.delete(id);
    await enqueue("takeoffs", "delete", { id }, nextUpdatedAt(row.updatedAt));
  });
  scheduleSync();
}
