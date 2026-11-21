import { describe, expect, it } from "vitest";
import type { Project, SiteLog } from "@/lib/offline/db";
import { DEFAULT_STUDIO_PROFILE } from "@/lib/offline/profile";
import { buildSiteLogReport } from "./export-site-log";

const time = "2026-11-20T12:00:00.000Z";
const log: SiteLog = {
  id: "visit",
  projectId: "site",
  visitType: "visita",
  visitDate: "2026-11-20",
  attendees: "  Rosa Flores  ",
  workStatus: "Avance de obra",
  findings: "",
  orders: " ",
  followUp: "",
  topics: ["suelos"],
  photos: [
    {
      id: "photo",
      dataUrl: "data:image/jpeg;base64,AA==",
      caption: "Cimentación",
      createdAt: time,
    },
  ],
  createdAt: time,
  updatedAt: time,
  syncState: "local",
};
const project: Project = {
  id: "site",
  name: "Edificio José María",
  location: "Lima",
  typology: "Vivienda",
  status: "activo",
  updatedAt: time,
  syncState: "local",
};
const studio = {
  ...DEFAULT_STUDIO_PROFILE,
  studioName: "Estudio Lima",
  fullName: "Rosa Flores",
  capNumber: "12345",
  ruc: "10123456789",
  address: "Av. Lima",
  logoDataUrl: "data:image/png;base64,AA==",
};

describe("informe de bitácora", () => {
  it("forma el membrete, la ficha de visita, secciones, fotos y firma", () => {
    const report = buildSiteLogReport(log, project, studio);
    expect(report).toMatchObject({
      title: "Informe de visita de obra",
      filename: "bitacora-edificio-jose-maria-2026-11-20.pdf",
      letterhead: {
        name: "Estudio Lima",
        logo: studio.logoDataUrl,
        fields: ["RUC 10123456789", "Av. Lima", "Rosa Flores · CAP 12345"],
      },
      sections: [
        { title: "Estado de los trabajos", text: "Avance de obra" },
        { title: "Hallazgos", text: "Sin observaciones" },
        { title: "Órdenes o medidas impartidas", text: "Sin observaciones" },
        { title: "Seguimiento de visita anterior", text: "Sin observaciones" },
      ],
      topics: ["Suelos y cimentación"],
      photos: log.photos,
      signature: "Rosa Flores · CAP 12345",
    });
    expect(report.fields.map(({ value }) => value)).toEqual([
      "Edificio José María",
      "Lima",
      "Vivienda",
      "Visita de obra",
      "20/11/2026",
      "Rosa Flores",
    ]);
    expect(report.disclaimer).toContain("seguimiento de obra");
  });

  it("conserva el tipo de acta con un proyecto eliminado o una visita sin proyecto", () => {
    expect(buildSiteLogReport({ ...log, visitType: "apertura" }, null, studio).title).toBe(
      "Acta de apertura de obra",
    );
    expect(buildSiteLogReport(log, null, studio).fields[0].value).toBe("Proyecto eliminado");
    expect(
      buildSiteLogReport({ ...log, projectId: null, visitType: "cierre" }, null, studio),
    ).toMatchObject({
      title: "Acta de cierre de obra",
      filename: "bitacora-sin-proyecto-2026-11-20.pdf",
    });
  });
});
