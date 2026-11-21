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

type ProjectDetails = Pick<Project, "client" | "builtArea">;
type NewProject = Omit<Project, "id" | "updatedAt" | "syncState" | keyof ProjectDetails> &
  Partial<ProjectDetails>;

export async function saveProject(
  input: NewProject | (Partial<NewProject> & { id: string }),
): Promise<Project> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const project = await localDb.transaction("rw", [localDb.projects, localDb.outbox], async () => {
    const previous = "id" in input ? await localDb.projects.get(input.id) : undefined;
    if ("id" in input && !previous) throw new Error("El proyecto ya no está disponible.");
    const row: Project = {
      name: input.name ?? previous?.name ?? "",
      location: input.location ?? previous?.location ?? "",
      typology: input.typology ?? previous?.typology ?? "",
      status: input.status ?? previous?.status ?? "activo",
      client: input.client ?? previous?.client ?? "",
      builtArea: input.builtArea === undefined ? (previous?.builtArea ?? null) : input.builtArea,
      id: previous?.id ?? createLocalUuid(),
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
      localDb.project_photos,
    ],
    async () => {
      const project = await localDb.projects.get(id);
      if (!project) return;
      await localDb.projects.delete(id);
      // Everything that hangs from the project goes with it; quotes stay, unlinked.
      await localDb.project_notes.where("projectId").equals(id).delete();
      await localDb.project_links.where("projectId").equals(id).delete();
      await localDb.project_photos.where("projectId").equals(id).delete();
      const takeoffs = await localDb.takeoffs.where("projectId").equals(id).toArray();
      await localDb.takeoffs.bulkDelete(takeoffs.map((takeoff) => takeoff.id));
      await enqueue("projects", "delete", { id }, nextUpdatedAt(project.updatedAt));
    },
  );
  scheduleSync();
}

export class StaleTakeoffError extends Error {}

export async function saveTakeoff(
  input: Omit<Takeoff, "id" | "updatedAt" | "syncState"> & { id?: string },
): Promise<Takeoff> {
  const localDb = db;
  if (!localDb) throw new Error("IndexedDB solo está disponible en el navegador.");

  const takeoff = await localDb.transaction("rw", [localDb.takeoffs, localDb.outbox], async () => {
    const previous = input.id ? await localDb.takeoffs.get(input.id) : undefined;
    if (input.id && previous?.projectId !== input.projectId) throw new StaleTakeoffError();
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
