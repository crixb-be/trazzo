import { db, createLocalUuid, type Project, type Takeoff } from "./db";
import { scheduleSync } from "./sync";

async function enqueue(
  table: "projects" | "takeoffs",
  op: "upsert" | "delete",
  payload: unknown,
): Promise<void> {
  if (!db) return;
  await db.outbox.add({
    table,
    op,
    payload,
    createdAt: new Date().toISOString(),
  });
  scheduleSync();
}

export async function saveProject(
  input: Omit<Project, "id" | "updatedAt" | "syncState"> & { id?: string },
): Promise<Project> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const project: Project = {
    ...input,
    id: input.id ?? createLocalUuid(),
    updatedAt: new Date().toISOString(),
    syncState: "pending",
  };
  await localDb.projects.put(project);
  await enqueue("projects", "upsert", project);
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
    ],
    async () => {
      await localDb.projects.delete(id);
      // Everything that hangs from the project goes with it; quotes stay, unlinked.
      await localDb.project_notes.where("projectId").equals(id).delete();
      await localDb.project_links.where("projectId").equals(id).delete();
      await localDb.project_options.delete(id);
      const takeoffs = await localDb.takeoffs.where("projectId").equals(id).toArray();
      await localDb.takeoffs.bulkDelete(takeoffs.map((takeoff) => takeoff.id));
      await enqueue("projects", "delete", { id });
    },
  );
}

export async function saveTakeoff(
  input: Omit<Takeoff, "id" | "updatedAt" | "syncState"> & { id?: string },
): Promise<Takeoff> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const takeoff: Takeoff = {
    ...input,
    id: input.id ?? createLocalUuid(),
    updatedAt: new Date().toISOString(),
    syncState: "pending",
  };
  await localDb.takeoffs.put(takeoff);
  await enqueue("takeoffs", "upsert", takeoff);
  return takeoff;
}

export async function deleteTakeoff(id: string): Promise<void> {
  const localDb = db;
  if (!localDb) return;
  await localDb.transaction("rw", [localDb.takeoffs, localDb.outbox], async () => {
    await localDb.takeoffs.delete(id);
    await enqueue("takeoffs", "delete", { id });
  });
}
