import { describe, expect, it } from "vitest";
import type { Project, Takeoff } from "./db";
import {
  describeSyncResult,
  planPull,
  projectToRow,
  rowToProject,
  rowToTakeoff,
  takeoffToRow,
} from "./sync-mappers";

const project: Project = {
  id: "p1",
  name: "Casa Miraflores",
  location: "Lima",
  typology: "Vivienda",
  client: "Constructora",
  builtArea: 122.5,
  status: "activo",
  updatedAt: "2026-06-01T10:00:00.000Z",
  syncState: "pending",
};

const takeoff: Takeoff = {
  id: "t1",
  projectId: "p1",
  partName: "Muro de soga",
  materialCode: "ladrillo-king-kong-18",
  length: 4,
  width: 2.4,
  height: 0,
  quantity: 9.6,
  wastePct: 5,
  total: 394,
  subtotalPen: 551.6,
  unitPricePen: 1.4,
  updatedAt: "2026-06-01T10:05:00.000Z",
  syncState: "pending",
};

describe("sync mappers", () => {
  it("sends projects with the owner and snake_case columns only", () => {
    expect(projectToRow(project, "user-1")).toEqual({
      id: "p1",
      user_id: "user-1",
      name: "Casa Miraflores",
      location: "Lima",
      typology: "Vivienda",
      client: "Constructora",
      built_area: 122.5,
      status: "activo",
      updated_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("sends takeoffs without local-only fields", () => {
    const row = takeoffToRow(takeoff);
    expect(row).toMatchObject({ project_id: "p1", part_name: "Muro de soga", unit_price_pen: 1.4 });
    expect(row).not.toHaveProperty("syncState");
    expect(row).not.toHaveProperty("projectId");
  });

  it("round-trips a project and a takeoff as synced records", () => {
    expect(rowToProject(projectToRow(project, "user-1"))).toEqual({
      ...project,
      syncState: "synced",
    });
    expect(rowToTakeoff(takeoffToRow(takeoff))).toEqual({ ...takeoff, syncState: "synced" });
  });

  it("reads numeric columns that arrive as strings and rejects rows without id", () => {
    expect(
      rowToTakeoff({ id: "t2", project_id: "p1", length: "3.50", subtotal_pen: "12.30" }),
    ).toMatchObject({ length: 3.5, subtotalPen: 12.3 });
    expect(rowToProject({ name: "sin id" })).toBeNull();
    expect(rowToProject({ id: "p1", client: 42, built_area: "-1" })).toMatchObject({
      client: "",
      builtArea: null,
    });
    expect(rowToProject({ id: "p1", client: "Cliente", built_area: "120.50" })).toMatchObject({
      client: "Cliente",
      builtArea: 120.5,
    });
    expect(rowToProject({ id: "p1" })).toMatchObject({ client: "", builtArea: null });
  });
});

describe("planPull", () => {
  const old = "2026-06-01T10:00:00Z";
  const recent = "2026-06-01T10:05:00Z";
  const local = [{ ...project, updatedAt: recent }];
  const version = (updatedAt: string) => ({
    id: project.id,
    updatedAt,
    record: { ...project, name: "Nube", updatedAt },
  });

  it("never removes a record just because it was not returned", () => {
    expect(planPull([{ ...local[0], syncState: "synced" }], [], new Set()).remove).toEqual([]);
  });

  it("preserves a newer local version and pending edits or deletions", () => {
    expect(planPull(local, [version(old)], new Set()).put).toEqual([]);
    expect(planPull(local, [version(recent)], new Set([project.id])).put).toEqual([]);
    expect(planPull([], [version(recent)], new Set([project.id])).put).toEqual([]);
    expect(planPull([{ ...project, updatedAt: old }], [version(recent)], new Set()).put).toEqual([
      version(recent).record,
    ]);
  });

  it("honors only a current, explicit tombstone", () => {
    const tombstone = { ...version(recent), record: null };
    expect(planPull(local, [tombstone], new Set()).remove).toEqual([project.id]);
    expect(planPull(local, [{ ...tombstone, updatedAt: old }], new Set()).remove).toEqual([]);
    expect(planPull(local, [tombstone], new Set([project.id])).remove).toEqual([]);
  });
});

describe("describeSyncResult", () => {
  const base = { sent: 0, failed: 0, pulled: 0, error: null };

  it("never reports success when nothing reached the cloud", () => {
    expect(describeSyncResult({ ...base, status: "signed-out" })).toMatch(/Inicia sesión/);
    expect(describeSyncResult({ ...base, status: "not-configured" })).toMatch(/este dispositivo/);
    expect(describeSyncResult({ ...base, status: "offline" })).toMatch(/Sin conexión/);
  });

  it("reports partial failures and real totals", () => {
    expect(describeSyncResult({ ...base, status: "partial", sent: 2, failed: 1 })).toMatch(
      /2 cambios y 1 quedaron pendientes/,
    );
    expect(describeSyncResult({ ...base, status: "ok", sent: 3, pulled: 5 })).toMatch(
      /3 cambios enviados y 5 registros/,
    );
    expect(describeSyncResult({ ...base, status: "ok" })).toBe("Todo está al día.");
  });
});
