import type { FeeQuote, Project, ProjectStatus, Takeoff } from "./db";

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

/**
 * Decides what a pull changes locally.
 * - A record with a queued local change is left alone (the device wins until
 *   its change is sent).
 * - Otherwise the cloud copy replaces the local one.
 * - A local record that was already synced but is gone from the cloud was
 *   deleted on another device, so it is removed here too. Records that never
 *   reached the cloud are kept.
 */
export function planPull<T extends { id: string }>(
  local: Array<{ id: string; syncState: string }>,
  remote: T[],
  pendingIds: ReadonlySet<string>,
): PullPlan<T> {
  const remoteIds = new Set(remote.map((record) => record.id));
  return {
    put: remote.filter((record) => !pendingIds.has(record.id)),
    remove: local
      .filter(
        (record) =>
          record.syncState === "synced" && !remoteIds.has(record.id) && !pendingIds.has(record.id),
      )
      .map((record) => record.id),
  };
}

export type SyncOutcome =
  "ok" | "partial" | "offline" | "not-configured" | "signed-out" | "busy" | "error";

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
