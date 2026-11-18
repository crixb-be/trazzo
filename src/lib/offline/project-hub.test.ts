import { describe, expect, it, vi } from "vitest";
import { MEASURES } from "@/data/medidas";
import { DEFAULT_WEIGHTS } from "@/lib/matrix/relations";
import {
  fieldToolResultSheet,
  materialsResultSheet,
  matrixResultSheet,
  measureResultSheet,
} from "@/lib/share/workspace-sheets";

const { put, add } = vi.hoisted(() => ({ put: vi.fn(), add: vi.fn() }));

vi.mock("./db", () => ({
  db: {
    project_notes: { put },
    outbox: { add },
    transaction: (_mode: string, _tables: unknown[], write: () => Promise<void>) => write(),
  },
  createLocalUuid: () => "note-1",
  nextUpdatedAt: () => "2026-11-18T10:00:00.000Z",
}));
vi.mock("./sync", () => ({ scheduleSync: vi.fn() }));

import { saveProjectNote } from "./project-hub";

describe("project hub result notes", () => {
  it("stores all four workspace results in the existing ProjectNote shape", async () => {
    const matrix = {
      rooms: [
        { id: "sala", name: "Sala" },
        { id: "cocina", name: "Cocina" },
      ],
      relations: { '["cocina","sala"]': "necesaria" as const },
      weights: DEFAULT_WEIGHTS,
    };
    const sheets = [
      materialsResultSheet({
        modeLabel: "Concreto por resistencia",
        lines: [{ name: "Cemento", quantity: 9, unit: "bls", pricePen: 28 }],
      }),
      fieldToolResultSheet({ toolLabel: "Pendientes", result: "12 %" }),
      matrixResultSheet(matrix, [{ id: "sala", name: "Sala", score: 3 }]),
      measureResultSheet(MEASURES[0]),
    ];

    for (const sheet of sheets) await saveProjectNote("project-1", sheet);

    expect(put).toHaveBeenCalledTimes(4);
    expect(add).toHaveBeenCalledTimes(4);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        table: "project_notes",
        op: "upsert",
        payload: expect.objectContaining({ id: "note-1" }),
      }),
    );
    for (const [sheet] of sheets.map((sheet) => [sheet])) {
      expect(put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "note-1",
          projectId: "project-1",
          eyebrow: sheet.eyebrow,
          title: sheet.title,
          subtitle: sheet.subtitle,
          rows: sheet.rows,
          notes: sheet.notes,
        }),
      );
    }
  });
});
