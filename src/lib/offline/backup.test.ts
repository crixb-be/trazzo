import { describe, expect, it } from "vitest";
import {
  backupFileName,
  buildBackup,
  checkProjectLimit,
  describeBackup,
  parseBackup,
  type BackupContents,
} from "./backup";

const contents: BackupContents = {
  projects: [
    {
      id: "p1",
      name: "Casa Lima",
      location: "",
      typology: "",
      status: "activo",
      updatedAt: "2026-11-16T00:00:00.000Z",
      syncState: "synced",
    },
  ],
  takeoffs: [],
  feeQuotes: [],
  projectOptions: [{ projectId: "p1", area: 120 }],
  projectNotes: [
    {
      id: "n1",
      projectId: "p1",
      eyebrow: "RESULTADO / A.010",
      title: "15 contrapasos",
      subtitle: "",
      rows: [],
      notes: [],
      createdAt: "2026-11-16T00:00:00.000Z",
    },
  ],
  projectLinks: [],
  projectPhotos: [
    {
      id: "f1",
      projectId: "p1",
      dataUrl: "data:image/jpeg;base64,AAAA",
      caption: "",
      createdAt: "",
    },
    { id: "f2", projectId: "p1", dataUrl: "javascript:alert(1)", caption: "", createdAt: "" },
  ],
  libraryActivity: [],
  studioProfile: null,
  meta: [
    { key: "relation-matrix", value: "{}" },
    { key: "seedVersion", value: "9" },
  ],
};

describe("backup file", () => {
  it("round-trips through JSON and keeps only portable settings", () => {
    const file = buildBackup(contents, new Date("2026-11-16T12:00:00Z"));
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.projects[0].name).toBe("Casa Lima");
    expect(parsed.backup.projectNotes).toHaveLength(1);
    // Only real images survive, and copies without photos still load.
    expect(parsed.backup.projectPhotos.map((photo) => photo.id)).toEqual(["f1"]);
    const { projectPhotos: _dropped, ...older } = file;
    void _dropped;
    const legacy = parseBackup(JSON.stringify(older));
    expect(legacy.ok && legacy.backup.projectPhotos).toEqual([]);
    expect(parsed.backup.meta.map((row) => row.key)).toEqual(["relation-matrix"]);
    expect(describeBackup(parsed.backup)).toContain("1 proyecto(s)");
    expect(backupFileName(new Date("2026-11-16T12:00:00Z"))).toBe("trazzo-copia-2026-11-16.json");
  });

  it("refuses files that are not a TRAZZO backup", () => {
    expect(parseBackup("no es json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ format: "otro" })).ok).toBe(false);
    expect(parseBackup(JSON.stringify([1, 2])).ok).toBe(false);
    const newer = parseBackup(JSON.stringify({ ...buildBackup(contents), version: 99 }));
    expect(newer.ok).toBe(false);
    const damaged = parseBackup(
      JSON.stringify({ ...buildBackup(contents), projects: [{ name: "sin id" }] }),
    );
    expect(damaged).toEqual({ ok: false, error: "La copia está incompleta o dañada." });
  });

  it("applies the plan's project limit to the merged result", () => {
    const file = buildBackup(contents);
    expect(checkProjectLimit("free", [], file).ok).toBe(true);
    expect(checkProjectLimit("free", ["p1"], file).ok).toBe(true);
    expect(checkProjectLimit("free", ["otro"], file).ok).toBe(false);
    expect(checkProjectLimit("pro", ["otro"], file).ok).toBe(true);
  });
});
