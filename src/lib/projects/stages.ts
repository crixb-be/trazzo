import type { ProjectNote } from "@/lib/offline/db";

interface ProjectStageInput {
  projectId?: string;
  notes: readonly Pick<ProjectNote, "eyebrow">[];
  takeoffsCount: number;
  quotesCount: number;
  siteLogsCount: number;
  photosCount: number;
}

type StageStatus = "done" | "current" | "pending";

export function projectStages(input: ProjectStageInput) {
  const isCabida = (note: Pick<ProjectNote, "eyebrow">) => /^cabida\b/i.test(note.eyebrow.trim());
  const isDesignCalculation = (note: Pick<ProjectNote, "eyebrow">) =>
    !isCabida(note) && !/^medidas\b/i.test(note.eyebrow.trim());
  const stages = [
    {
      id: "site",
      label: "Sitio y Cabida",
      done: input.notes.some(isCabida) || input.photosCount > 0,
      href: "/calculadoras?tab=cabida",
      hint: "Guarda una cabida o agrega fotos del sitio.",
    },
    {
      id: "design",
      label: "Diseño y Matriz",
      done: input.notes.some(isDesignCalculation),
      href: "/matriz",
      secondaryHref: "/calculadoras",
      secondaryLabel: "Calculadoras",
      hint: "Guarda un cálculo de diseño.",
    },
    {
      id: "cost",
      label: "Costos y Metrados",
      done: input.takeoffsCount > 0 || input.quotesCount > 0,
      href: input.projectId
        ? "?project=" + encodeURIComponent(input.projectId) + "&tab=metrados#partidas"
        : "#partidas",
      secondaryHref: "/honorarios",
      secondaryLabel: "Honorarios",
      hint: "Agrega partidas o vincula una cotización.",
    },
    {
      id: "work",
      label: "Obra y Bitácora",
      done: input.siteLogsCount > 0,
      href: input.projectId
        ? "/bitacora?project=" + encodeURIComponent(input.projectId)
        : "/bitacora",
      hint: "Registra una visita de obra.",
    },
  ];
  const current = stages.findIndex((stage) => !stage.done);
  return stages.map(({ done, ...stage }, index) => ({
    ...stage,
    status: (done ? "done" : index === current ? "current" : "pending") satisfies StageStatus,
  }));
}
