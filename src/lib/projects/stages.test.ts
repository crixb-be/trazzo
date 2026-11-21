import { describe, expect, it } from "vitest";
import { projectStages } from "./stages";

const empty = {
  projectId: "obra",
  notes: [],
  takeoffsCount: 0,
  quotesCount: 0,
  siteLogsCount: 0,
  photosCount: 0,
};

describe("etapas del proyecto", () => {
  it("muestra una etapa activa y conserva los destinos del flujo", () => {
    const stages = projectStages(empty);
    expect(stages.map((stage) => stage.status)).toEqual([
      "current",
      "pending",
      "pending",
      "pending",
    ]);
    expect(stages.map((stage) => stage.href)).toEqual([
      "/calculadoras?tab=cabida",
      "/matriz",
      "?project=obra&tab=metrados#partidas",
      "/bitacora?project=obra",
    ]);
    expect(stages[1].secondaryHref).toBe("/calculadoras");
    expect(stages[2].secondaryHref).toBe("/honorarios");
  });

  it("distingue cabida de otros cálculos y reconoce una visita aunque falten etapas", () => {
    expect(
      projectStages({
        ...empty,
        notes: [{ eyebrow: "CABIDA / ESTIMACIÓN" }],
        siteLogsCount: 1,
      }).map((stage) => stage.status),
    ).toEqual(["done", "current", "pending", "done"]);
  });

  it("completa todas las etapas con fotos, un cálculo, una cotización y una visita", () => {
    expect(
      projectStages({
        ...empty,
        photosCount: 1,
        notes: [{ eyebrow: "A.120" }],
        quotesCount: 1,
        siteLogsCount: 1,
      }).map((stage) => stage.status),
    ).toEqual(["done", "done", "done", "done"]);
    expect(projectStages({ ...empty, takeoffsCount: 1 })[2].status).toBe("done");
    expect(
      projectStages({ ...empty, notes: [{ eyebrow: "MEDIDAS / MOBILIARIO" }] })[1].status,
    ).toBe("pending");
    expect(projectStages({ ...empty, notes: [{ eyebrow: "MATRIZ / RELACIONES" }] })[1].status).toBe(
      "done",
    );
  });
});
