import type {
  FeeQuote,
  Project,
  ProjectNote,
  ProjectPhoto,
  ProjectStatus,
  SiteLog,
  Takeoff,
} from "./db";
import { siteLogSchema } from "@/lib/projects/site-log";

/**
 * Pure translation between the local (camelCase, IndexedDB) records and the
 * Supabase rows (snake_case, owned by `user_id`), plus the reconciliation rule
 * used when pulling. Kept free of I/O so it can be unit tested.
 */
type Row = Record<string, unknown>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const numeric = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const STATUSES: ProjectStatus[] = ["activo", "pausado", "cerrado"];

export function projectToRow(project: Project, userId: string): Row {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    location: project.location,
    typology: project.typology,
    status: project.status,
    updated_at: project.updatedAt,
  };
}

export function rowToProject(row: Row): Project | null {
  if (typeof row.id !== "string") return null;
  const status = STATUSES.includes(row.status as ProjectStatus)
    ? (row.status as ProjectStatus)
    : "activo";
  return {
    id: row.id,
    name: text(row.name),
    location: text(row.location),
    typology: text(row.typology),
    status,
    updatedAt: text(row.updated_at, new Date(0).toISOString()),
    syncState: "synced",
  };
}

export function takeoffToRow(takeoff: Takeoff): Row {
  return {
    id: takeoff.id,
    project_id: takeoff.projectId,
    part_name: takeoff.partName,
    material_code: takeoff.materialCode,
    length: takeoff.length,
    width: takeoff.width,
    height: takeoff.height,
    quantity: takeoff.quantity,
    waste_pct: takeoff.wastePct,
    total: takeoff.total,
    subtotal_pen: takeoff.subtotalPen,
    unit_price_pen: takeoff.unitPricePen ?? null,
    updated_at: takeoff.updatedAt,
  };
}

export function rowToTakeoff(row: Row): Takeoff | null {
  if (typeof row.id !== "string" || typeof row.project_id !== "string") return null;
  const takeoff: Takeoff = {
    id: row.id,
    projectId: row.project_id,
    partName: text(row.part_name),
    materialCode: text(row.material_code),
    length: numeric(row.length),
    width: numeric(row.width),
    height: numeric(row.height),
    quantity: numeric(row.quantity),
    wastePct: numeric(row.waste_pct),
    total: numeric(row.total),
    subtotalPen: numeric(row.subtotal_pen),
    updatedAt: text(row.updated_at, new Date(0).toISOString()),
    syncState: "synced",
  };
  if (row.unit_price_pen !== null && row.unit_price_pen !== undefined) {
    takeoff.unitPricePen = numeric(row.unit_price_pen);
  }
  return takeoff;
}

export function quoteToRow(quote: FeeQuote, userId: string): Row {
  return {
    id: quote.id,
    user_id: userId,
    code: quote.code,
    project_name: quote.projectName,
    client_name: quote.clientName,
    location: quote.location,
    typology: quote.input.typology,
    area_m2: quote.input.areaM2,
    total_pen: quote.totals.total,
    data: quote,
    created_at: quote.createdAt,
    updated_at: quote.updatedAt,
  };
}

export function rowToQuote(row: Row): FeeQuote | null {
  const data = row.data as Partial<FeeQuote> | null | undefined;
  if (typeof row.id !== "string" || !data || typeof data !== "object") return null;
  if (!data.input || !data.totals || !data.payment) return null;
  return {
    ...(data as FeeQuote),
    id: row.id,
    updatedAt: text(row.updated_at, data.updatedAt ?? new Date(0).toISOString()),
    syncState: "synced",
  };
}

export interface PullPlan<T> {
  put: T[];
  remove: string[];
}

export interface RemoteVersion<T> {
  id: string;
  updatedAt: string;
  /** Explicit deletion, not a record missing from a page of results. */
  record: T | null;
}

export function versionFromRow<T>(row: Row, map: (row: Row) => T | null): RemoteVersion<T> {
  if (typeof row.id !== "string" || typeof row.updated_at !== "string") {
    throw new Error("La nube devolvió un registro sin versión.");
  }
  const record = row.deleted_at ? null : map(row);
  if (!row.deleted_at && record === null)
    throw new Error("La nube devolvió un registro incompleto.");
  return { id: row.id, updatedAt: row.updated_at, record };
}

export function recordToRow(record: ProjectNote | ProjectPhoto, kind: "note" | "photo"): Row {
  return {
    id: record.id,
    project_id: record.projectId,
    kind,
    data: record,
    updated_at: record.updatedAt ?? record.createdAt,
  };
}

export function rowToNote(row: Row): ProjectNote | null {
  const data = row.data as ProjectNote | undefined;
  if (
    !data ||
    typeof data.title !== "string" ||
    !Array.isArray(data.rows) ||
    !Array.isArray(data.notes) ||
    typeof data.createdAt !== "string"
  )
    return null;
  return {
    ...data,
    id: row.id as string,
    projectId: row.project_id as string,
    updatedAt: row.updated_at as string,
    syncState: "synced",
  };
}

export function rowToPhoto(row: Row): ProjectPhoto | null {
  const data = row.data as ProjectPhoto | undefined;
  if (
    !data ||
    typeof data.dataUrl !== "string" ||
    !data.dataUrl.startsWith("data:image/") ||
    typeof data.caption !== "string" ||
    typeof data.createdAt !== "string"
  )
    return null;
  return {
    ...data,
    id: row.id as string,
    projectId: row.project_id as string,
    updatedAt: row.updated_at as string,
    syncState: "synced",
  };
}

export function siteLogToRow(log: SiteLog, userId: string): Row {
  return {
    id: log.id,
    user_id: userId,
    project_id: log.projectId,
    data: log,
    updated_at: log.updatedAt,
  };
}

export function rowToSiteLog(row: Row): SiteLog | null {
  if (typeof row.data !== "object" || !row.data || Array.isArray(row.data)) return null;
  const time = typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN;
  if (!Number.isFinite(time)) return null;
  const parsed = siteLogSchema.safeParse({
    ...row.data,
    id: row.id,
    projectId: row.project_id,
    updatedAt: new Date(time).toISOString(),
    syncState: "synced",
  });
  return parsed.success ? parsed.data : null;
}

export function recordTime(row: { updatedAt?: string; createdAt?: string }): number {
  return Date.parse(row.updatedAt ?? row.createdAt ?? "") || 0;
}

/**
 * Keep unacknowledged writes and deletions intact. After the server resolves a
 * queued change, apply its version only if it is at least as recent as the device.
 */
export function planPull<
  T extends { id: string; updatedAt?: string; createdAt?: string; syncState?: string },
>(local: T[], remote: RemoteVersion<T>[], pendingIds: ReadonlySet<string>): PullPlan<T> {
  const current = new Map(local.map((row) => [row.id, row]));
  const plan: PullPlan<T> = { put: [], remove: [] };
  for (const version of remote) {
    const row = current.get(version.id);
    if (pendingIds.has(version.id) || (row && recordTime(row) > recordTime(version))) continue;
    if (!version.record) {
      if (row) plan.remove.push(version.id);
    } else if (!row || row.syncState !== "synced" || recordTime(row) !== recordTime(version)) {
      plan.put.push(version.record);
    }
  }
  return plan;
}

export type SyncOutcome =
  | "ok"
  | "partial"
  | "offline"
  | "not-configured"
  | "signed-out"
  | "account-mismatch"
  | "busy"
  | "error";

export interface SyncResult {
  status: SyncOutcome;
  sent: number;
  failed: number;
  pulled: number;
  error: string | null;
}

/** What the user is told after pressing "Sincronizar ahora". Never claims more than happened. */
export function describeSyncResult(result: SyncResult): string {
  switch (result.status) {
    case "not-configured":
      return "Tus datos están guardados en este dispositivo. El respaldo en la nube aún no está disponible.";
    case "signed-out":
      return "Tus datos están guardados en este dispositivo. Inicia sesión para respaldarlos en tu cuenta.";
    case "account-mismatch":
      return "Este dispositivo contiene datos de otra cuenta. Vuelve a esa cuenta para sincronizar.";
    case "offline":
      return "Sin conexión: tus cambios quedan guardados aquí y se enviarán al reconectar.";
    case "busy":
      return "Ya hay una sincronización en curso.";
    case "error":
      return "No se pudo sincronizar. Tus datos locales están intactos.";
    case "partial":
      return (
        "Se enviaron " +
        result.sent +
        " cambios y " +
        result.failed +
        " quedaron pendientes; se reintentarán. Tus datos locales están intactos."
      );
    case "ok":
      return result.sent === 0 && result.pulled === 0
        ? "Todo está al día."
        : "Sincronización completada: " +
            result.sent +
            " cambios enviados y " +
            result.pulled +
            " registros actualizados desde tu cuenta.";
  }
}
