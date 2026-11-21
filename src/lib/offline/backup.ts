import { PLANS, type Plan } from "@/lib/plans/plans";
import {
  db,
  nextUpdatedAt,
  type SiteLog,
  type FeeQuote,
  type Meta,
  type Project,
  type ProjectLink,
  type ProjectNote,
  type ProjectPhoto,
  type StudioProfile,
  type Takeoff,
} from "./db";
import { siteLogSchema } from "@/lib/projects/site-log";
import { scheduleSync } from "./sync";

/**
 * Backup of the user's own work in one JSON file. The RNE catalogue and the
 * materials list are not included: they ship with the app.
 */
export const BACKUP_FORMAT = "trazzo-backup";
export const BACKUP_VERSION = 1;

/** Device-only settings worth carrying to another phone. */
const META_KEYS = ["relation-matrix", "professional:fullName", "professional:capNumber"];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  projects: Project[];
  takeoffs: Takeoff[];
  feeQuotes: FeeQuote[];
  projectOptions: Array<{ projectId: string; area: number }>;
  projectNotes: ProjectNote[];
  projectLinks: ProjectLink[];
  projectPhotos: ProjectPhoto[];
  siteLogs: SiteLog[];
  libraryActivity: Array<{ slug: string; favorite: boolean; visitedAt: string }>;
  studioProfile: StudioProfile | null;
  meta: Meta[];
}

export type BackupContents = Omit<BackupFile, "format" | "version" | "exportedAt">;

export function buildBackup(contents: BackupContents, now: Date = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...contents,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return "trazzo-copia-" + now.toISOString().slice(0, 10) + ".json";
}

export type ParsedBackup = { ok: true; backup: BackupFile } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rowsWith(value: unknown, keys: string[]): Record<string, unknown>[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  for (const row of value) {
    if (!isRecord(row)) return null;
    if (keys.some((key) => typeof row[key] !== "string" || row[key] === "")) return null;
  }
  return value as Record<string, unknown>[];
}

/** Reads a backup file defensively: anything unexpected is refused with a reason. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es una copia de TRAZZO (no se pudo leer)." };
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    return { ok: false, error: "El archivo no es una copia de TRAZZO." };
  }
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: "La copia viene de una versión más nueva de TRAZZO. Actualiza la app.",
    };
  }
  const projects = rowsWith(data.projects, ["id", "name"]);
  const takeoffs = rowsWith(data.takeoffs, ["id", "projectId"]);
  const feeQuotes = rowsWith(data.feeQuotes, ["id", "code"]);
  const projectOptions = rowsWith(data.projectOptions, ["projectId"]);
  const projectNotes = rowsWith(data.projectNotes, ["id", "projectId", "title"]);
  const projectLinks = rowsWith(data.projectLinks, ["quoteId", "projectId"]);
  // Absent in copies made before photos existed.
  const projectPhotos = rowsWith(data.projectPhotos, ["id", "projectId", "dataUrl"]);
  const siteLogs = siteLogSchema
    .array()
    .safeParse(data.siteLogs === undefined ? [] : data.siteLogs);
  const libraryActivity = rowsWith(data.libraryActivity, ["slug"]);
  const meta = rowsWith(data.meta, ["key"]);
  if (
    !projects ||
    !takeoffs ||
    !feeQuotes ||
    !projectOptions ||
    !projectNotes ||
    !projectLinks ||
    !projectPhotos ||
    !siteLogs.success ||
    !libraryActivity ||
    !meta
  ) {
    return { ok: false, error: "La copia está incompleta o dañada." };
  }
  const studio = isRecord(data.studioProfile) ? data.studioProfile : null;
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: data.version,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
      projects: projects as unknown as Project[],
      takeoffs: takeoffs as unknown as Takeoff[],
      feeQuotes: feeQuotes as unknown as FeeQuote[],
      projectOptions: projectOptions as unknown as BackupFile["projectOptions"],
      projectNotes: projectNotes as unknown as ProjectNote[],
      projectLinks: projectLinks as unknown as ProjectLink[],
      projectPhotos: (projectPhotos as unknown as ProjectPhoto[]).filter((photo) =>
        photo.dataUrl.startsWith("data:image/"),
      ),
      siteLogs: siteLogs.data,
      libraryActivity: libraryActivity as unknown as BackupFile["libraryActivity"],
      studioProfile: studio ? ({ ...studio, id: "default" } as StudioProfile) : null,
      meta: (meta as unknown as Meta[]).filter((row) => META_KEYS.includes(row.key)),
    },
  };
}

export function describeBackup(backup: BackupFile): string {
  const parts = [
    backup.projects.length + " proyecto(s)",
    backup.takeoffs.length + " partida(s)",
    backup.feeQuotes.length + " cotización(es)",
    backup.projectNotes.length + " cálculo(s) guardado(s)",
    backup.projectPhotos.length + " foto(s)",
    backup.siteLogs.length + " visita(s) de obra",
  ];
  return parts.join(", ");
}

/**
 * Restoring merges by id: what is in the file replaces the same record here and
 * nothing else is deleted. The plan's project limit still applies.
 */
export function checkProjectLimit(
  plan: Plan,
  existingProjectIds: readonly string[],
  backup: BackupFile,
): { ok: true } | { ok: false; error: string } {
  const merged = new Set([...existingProjectIds, ...backup.projects.map((p) => p.id)]);
  const limit = PLANS[plan].projects;
  if (merged.size <= limit) return { ok: true };
  return {
    ok: false,
    error:
      "Tu plan permite " +
      limit +
      " proyecto(s) y al restaurar quedarían " +
      merged.size +
      ". Elimina proyectos o cambia de plan.",
  };
}

export async function exportBackup(): Promise<BackupFile> {
  if (!db) throw new Error("La base local no está disponible.");
  const [
    projects,
    takeoffs,
    feeQuotes,
    projectOptions,
    projectNotes,
    projectLinks,
    projectPhotos,
    siteLogs,
    libraryActivity,
    studioProfile,
    meta,
  ] = await Promise.all([
    db.projects.toArray(),
    db.takeoffs.toArray(),
    db.fee_quotes.toArray(),
    db.project_options.toArray(),
    db.project_notes.toArray(),
    db.project_links.toArray(),
    db.project_photos.toArray(),
    db.site_logs.toArray(),
    db.library_activity.toArray(),
    db.studio_profile.get("default"),
    db.meta.where("key").anyOf(META_KEYS).toArray(),
  ]);
  return buildBackup({
    projects,
    takeoffs,
    feeQuotes,
    projectOptions,
    projectNotes,
    projectLinks,
    projectPhotos,
    siteLogs,
    libraryActivity,
    studioProfile: studioProfile ?? null,
    meta,
  });
}

export async function importBackup(
  backup: BackupFile,
  plan: Plan,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const localDb = db;
  if (!localDb) return { ok: false, error: "La base local no está disponible." };
  const existing = (await localDb.projects.toCollection().primaryKeys()) as string[];
  const limit = checkProjectLimit(plan, existing, backup);
  if (!limit.ok) return limit;

  const now = new Date().toISOString();
  // Restored work is queued again so it also reaches the account when there is one.
  const restored = <T extends object>(row: T) => ({
    ...row,
    updatedAt: now,
    syncState: "pending" as const,
  });
  const projects = backup.projects.map(restored);
  const takeoffs = backup.takeoffs.map(restored);
  const quotes = backup.feeQuotes.map(restored);
  const notes = backup.projectNotes.map(restored);
  const photos = backup.projectPhotos.map(restored);
  await localDb.transaction(
    "rw",
    [
      localDb.projects,
      localDb.takeoffs,
      localDb.fee_quotes,
      localDb.project_options,
      localDb.project_notes,
      localDb.project_links,
      localDb.project_photos,
      localDb.site_logs,
      localDb.library_activity,
      localDb.studio_profile,
      localDb.meta,
      localDb.outbox,
    ],
    async () => {
      await localDb.projects.bulkPut(projects);
      await localDb.takeoffs.bulkPut(takeoffs);
      await localDb.fee_quotes.bulkPut(quotes);
      await localDb.project_options.bulkPut(backup.projectOptions);
      await localDb.project_notes.bulkPut(notes);
      await localDb.project_links.bulkPut(backup.projectLinks);
      await localDb.project_photos.bulkPut(photos);
      const previousLogs = await localDb.site_logs.bulkGet(backup.siteLogs.map((row) => row.id));
      const logs = backup.siteLogs.map((row, index) => ({
        ...restored(row),
        updatedAt: nextUpdatedAt(
          new Date(
            Math.max(
              Date.parse(previousLogs[index]?.updatedAt ?? row.updatedAt),
              Date.parse(row.updatedAt),
            ),
          ).toISOString(),
        ),
      }));
      await localDb.site_logs.bulkPut(logs);
      await localDb.library_activity.bulkPut(backup.libraryActivity);
      if (backup.studioProfile) await localDb.studio_profile.put(backup.studioProfile);
      await localDb.meta.bulkPut(backup.meta);
      await localDb.outbox.bulkAdd([
        ...projects.map((payload) => ({
          table: "projects" as const,
          op: "upsert" as const,
          payload,
          createdAt: now,
        })),
        ...takeoffs.map((payload) => ({
          table: "takeoffs" as const,
          op: "upsert" as const,
          payload,
          createdAt: now,
        })),
        ...quotes.map((payload) => ({
          table: "fee_quotes" as const,
          op: "upsert" as const,
          payload,
          createdAt: now,
        })),
        ...notes.map((payload) => ({
          table: "project_notes" as const,
          op: "upsert" as const,
          payload,
          createdAt: now,
        })),
        ...logs.map((payload) => ({
          table: "site_logs" as const,
          op: "upsert" as const,
          payload,
          createdAt: payload.updatedAt,
        })),
        ...photos.map((payload) => ({
          table: "project_photos" as const,
          op: "upsert" as const,
          payload,
          createdAt: now,
        })),
      ]);
    },
  );
  scheduleSync();
  return { ok: true };
}
