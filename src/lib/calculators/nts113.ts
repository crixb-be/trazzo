import {
  NTS113_AREAS,
  NTS113_CORRIDORS,
  NTS113_DOORS,
  integratedStairWidth,
  type HealthCategory,
} from "@/data/norms/nts113";
import type { CalcCheck } from "./types";

export type HealthCheckKind = "area" | "corredor" | "puerta" | "altura" | "escalera";

/** I-4 height rules depend on whether the facility is new or an existing one upgraded. */
export type I4Project = "nuevo" | "existente";

export interface HealthCheckResult {
  /** False when the environment does not apply to the selected category. */
  applies: boolean;
  minimum: number;
  unit: "m²" | "m";
  pass: boolean;
  label: string;
  ref: string;
  notes: string[];
  check: CalcCheck;
}

function assertProjected(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Ingresa un valor proyectado no negativo.");
  }
}

function result(
  label: string,
  minimum: number,
  projected: number,
  unit: "m²" | "m",
  ref: string,
  notes: string[] = [],
  applies = true,
): HealthCheckResult {
  const pass = applies && projected >= minimum;
  return {
    applies,
    minimum,
    unit,
    pass,
    label,
    ref,
    notes,
    check: {
      label,
      pass,
      value: `${projected.toFixed(2)} ${unit}`,
      limit: `≥ ${minimum.toFixed(2)} ${unit}`,
      ref,
    },
  };
}

/** Projected area against Cuadros N° 1, 4 and 5. */
export function checkHealthArea(
  code: string,
  category: HealthCategory,
  projected: number,
): HealthCheckResult {
  assertProjected(projected);
  const area = NTS113_AREAS.find((item) => item.code === code);
  if (!area) throw new Error("Ambiente no encontrado en la NTS 113.");
  const applies = area.categories.includes(category);
  const notes = [
    ...(area.note ? [area.note] : []),
    ...(applies
      ? []
      : [`Según la NTS 113 este ambiente corresponde a: ${area.categories.join(", ")}.`]),
  ];
  return result(area.name, area.area, projected, "m²", area.ref, notes, applies);
}

/** Corridor width, num. 6.2.1.1 b). */
export function checkHealthCorridor(id: string, projected: number): HealthCheckResult {
  assertProjected(projected);
  const corridor = NTS113_CORRIDORS.find((item) => item.id === id);
  if (!corridor) throw new Error("Tipo de corredor no encontrado.");
  return result(corridor.name, corridor.width, projected, "m", "NTS 113 · Num. 6.2.1.1 b)", [
    "Ancho libre entre muros, sin obstáculos (extintores y gabinetes solo empotrados).",
  ]);
}

/** Door width, Anexo N° 1. */
export function checkHealthDoor(id: string, projected: number): HealthCheckResult {
  assertProjected(projected);
  const door = NTS113_DOORS.find((item) => item.id === id);
  if (!door) throw new Error("Tipo de puerta no encontrado.");
  return result(door.name, door.width, projected, "m", "NTS 113 · Anexo N° 1", [
    "Altura de vano no menor a 2.10 m (num. 6.2.1.10).",
  ]);
}

/** Clear height, num. 6.2.1.6. */
export function healthMinimumHeight(
  category: HealthCategory,
  project: I4Project = "nuevo",
  xRayOrDelivery = false,
): number {
  if (category !== "I-4") return 2.7;
  if (project === "nuevo") return 3.0;
  return xRayOrDelivery ? 3.0 : 2.7;
}

export function checkHealthHeight(
  category: HealthCategory,
  projected: number,
  project: I4Project = "nuevo",
  xRayOrDelivery = false,
): HealthCheckResult {
  assertProjected(projected);
  const minimum = healthMinimumHeight(category, project, xRayOrDelivery);
  const notes =
    category === "I-4" && project === "nuevo"
      ? ["La altura total interior del establecimiento no será menor a 3.60 m."]
      : category === "I-4" && xRayOrDelivery
        ? ["Sala de Rayos X o Sala de Partos en establecimiento existente proyectado a I-4."]
        : [];
  return result(
    `Altura libre interior ${category}`,
    minimum,
    projected,
    "m",
    "NTS 113 · Num. 6.2.1.6",
    ["Medida desde el piso terminado al falso cielorraso o cielorraso.", ...notes],
  );
}

/** Integrated stair width, num. 6.2.1.1 b). */
export function checkHealthStair(category: HealthCategory, projected: number): HealthCheckResult {
  assertProjected(projected);
  return result(
    `Escalera integrada ${category}`,
    integratedStairWidth(category),
    projected,
    "m",
    "NTS 113 · Num. 6.2.1.1 b)",
    ["Pasamanos a ambos lados de 0.90 m de altura."],
  );
}
