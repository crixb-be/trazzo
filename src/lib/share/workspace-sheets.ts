import type { PocketMeasure } from "@/data/medidas";
import { getRelation, type RelationMatrix, type Relation } from "@/lib/matrix/relations";
import type { SheetRow, ResultSheet } from "./result-sheet";

const WORKSPACE_DISCLAIMER =
  "Resultado referencial generado por TRAZO. Revisa los datos y supuestos antes de usarlo en obra o expediente.";

function workspaceSheet(input: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: SheetRow[];
  notes?: string[];
  disclaimer?: string;
}): ResultSheet {
  return {
    kind: "calculo",
    eyebrow: input.eyebrow,
    title: input.title,
    subtitle: input.subtitle,
    rows: input.rows,
    notes: input.notes ?? [],
    disclaimer: input.disclaimer ?? WORKSPACE_DISCLAIMER,
  };
}

export interface MaterialSheetLine {
  name: string;
  quantity: number;
  unit: string;
  pricePen: number;
}

export function materialsResultSheet(input: {
  modeLabel: string;
  lines: MaterialSheetLine[];
  notes?: string[];
}): ResultSheet {
  return workspaceSheet({
    eyebrow: "MATERIALES / RESULTADO",
    title: input.modeLabel,
    subtitle: `${input.lines.length} materiales · merma incluida`,
    rows: input.lines.map((line) => ({
      label: line.name,
      value: `${line.quantity.toFixed(3)} ${line.unit} · S/ ${line.pricePen.toFixed(2)}`,
    })),
    notes: input.notes,
  });
}

export function fieldToolResultSheet(input: {
  toolLabel: string;
  result: string;
  notes?: string[];
}): ResultSheet {
  return workspaceSheet({
    eyebrow: "UTILIDADES DE CAMPO / RESULTADO",
    title: input.toolLabel,
    subtitle: input.result,
    rows: [{ label: "Resultado", value: input.result }],
    notes: input.notes,
  });
}

const relationLabels: Record<Relation, string> = {
  necesaria: "Necesarias",
  deseable: "Deseables",
  innecesaria: "Innecesarias",
};

export function matrixResultSheet(
  matrix: RelationMatrix,
  ranking: Array<{ id: string; name: string; score: number }>,
): ResultSheet {
  const relationCounts = matrix.rooms.flatMap((room, index) =>
    matrix.rooms.slice(index + 1).map((other) => getRelation(matrix, room.id, other.id)),
  );
  const rows: SheetRow[] = [
    { label: "Ambientes", value: String(matrix.rooms.length) },
    ...ranking.slice(0, 3).map((room, index) => ({
      label: `Prioridad ${index + 1}`,
      value: `${room.name || "Sin nombre"} · ${room.score} puntos`,
    })),
    ...Object.keys(relationLabels).map((relation) => ({
      label: relationLabels[relation as Relation],
      value: String(relationCounts.filter((item) => item === relation).length),
    })),
  ];
  return workspaceSheet({
    eyebrow: "MATRIZ / RELACIONES",
    title: "Matriz de relaciones",
    subtitle: `${matrix.rooms.length} ambientes · ${relationCounts.length} pares evaluados`,
    rows,
    notes: [
      "La ponderación orienta prioridades de diseño; no reemplaza la distribución de planta.",
      `Pesos: necesaria ${matrix.weights.necesaria}, deseable ${matrix.weights.deseable}, innecesaria ${matrix.weights.innecesaria}.`,
    ],
  });
}

export function measureResultSheet(measure: PocketMeasure): ResultSheet {
  return workspaceSheet({
    eyebrow: `MEDIDAS / ${measure.category.toUpperCase()}`,
    title: measure.title,
    subtitle: measure.note,
    rows: [
      { label: "Ancho", value: `${measure.width} m` },
      { label: "Profundidad", value: `${measure.depth} m` },
      { label: "Categoría", value: measure.category },
    ],
    notes: [
      measure.note,
      "Referencia de diseño; no representa un mínimo normativo ni sustituye la revisión profesional.",
    ],
  });
}
