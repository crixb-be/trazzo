import { DEFAULT_MATERIAL_INPUT, type MaterialMode } from "@/data/rendimientos";
import type { Material } from "@/data/seed-rne";
import type { Takeoff } from "@/lib/offline/db";
import { computeMaterials } from "./materials/quantities";

interface RoomPart {
  id: MaterialMode;
  name: string;
  chapter: string;
  area: number;
  /** Layer thickness in metres, when the recipe depends on it (falso piso / contrapiso). */
  thickness?: number;
}

/** Default falso piso / contrapiso thickness: 5 cm. */
export const DEFAULT_SLAB_THICKNESS_CM = 5;
/** Quick picks shown next to the thickness field. */
export const SLAB_THICKNESS_PRESETS = [
  { cm: 10, label: "Falso piso" },
  { cm: 5, label: "Contrapiso" },
  { cm: 2, label: "Fino" },
] as const;
const MAX_SLAB_THICKNESS_CM = 30;

function assertSlabThickness(cm: number): void {
  if (!Number.isFinite(cm) || cm <= 0 || cm > MAX_SLAB_THICKNESS_CM) {
    throw new Error(
      "Ingresa un espesor de falso piso / contrapiso entre 0 y " + MAX_SLAB_THICKNESS_CM + " cm.",
    );
  }
}

/** Adds the thickness (in metres) to a falso piso / contrapiso part and shows it in its name. */
function withSlabThickness(part: Omit<RoomPart, "thickness">, cm: number): RoomPart {
  assertSlabThickness(cm);
  const label = cm.toLocaleString("es-PE", { maximumFractionDigits: 1 });
  // Non-breaking spaces keep "(e = 5 cm)" on one line in narrow cards.
  return { ...part, name: `${part.name} (e\u00a0=\u00a0${label}\u00a0cm)`, thickness: cm / 100 };
}

/**
 * One recipe from the "Partida con receta" picker. Contrapiso uses the thickness
 * entered by the user instead of the 1.5 cm default meant for tarrajeo.
 */
export function recipePart(
  partida: { id: MaterialMode; name: string; chapter: string },
  area: number,
  slabThicknessCm: number = DEFAULT_SLAB_THICKNESS_CM,
): RoomPart {
  if (!Number.isFinite(area) || area <= 0) throw new Error("Ingresa un área mayor que cero.");
  const part = { id: partida.id, name: partida.name, chapter: partida.chapter, area };
  return partida.id === "contrapiso" ? withSlabThickness(part, slabThicknessCm) : part;
}

export function rectangularRoomParts({
  length,
  width,
  height,
  slabThicknessCm = DEFAULT_SLAB_THICKNESS_CM,
}: {
  length: number;
  width: number;
  height: number;
  /** Falso piso / contrapiso thickness in centimetres. */
  slabThicknessCm?: number;
}): RoomPart[] {
  if (![length, width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Ingresa largo, ancho y altura mayores que cero.");
  }
  assertSlabThickness(slabThicknessCm);
  const floor = length * width;
  const walls = 2 * (length + width) * height;
  if (![floor, walls].every((area) => Number.isFinite(area) && area > 0)) {
    throw new Error("Las áreas están fuera de rango.");
  }
  return [
    { id: "muro", name: "Muro de perímetro", chapter: "Albañilería", area: walls },
    withSlabThickness(
      { id: "contrapiso", name: "Falso piso / contrapiso", chapter: "Pisos", area: floor },
      slabThicknessCm,
    ),
    { id: "ceramico", name: "Acabado de piso", chapter: "Acabados", area: floor },
    { id: "losa", name: "Cubierta / losa", chapter: "Estructuras", area: floor },
  ];
}

export function roomPartTakeoffs(
  part: RoomPart,
  materials: readonly Material[],
): Omit<Takeoff, "id" | "projectId" | "updatedAt" | "syncState">[] {
  const input = {
    ...DEFAULT_MATERIAL_INPUT,
    area: part.area,
    ...(part.thickness !== undefined ? { thickness: part.thickness } : {}),
  };
  return computeMaterials(part.id, input).map((row) => {
    const material = materials.find(({ code }) => code === row.code);
    if (!material) throw new Error("Material no disponible: " + row.code);
    const subtotalPen = Math.round(row.quantity * material.ref_price_pen * 100) / 100;
    if (!Number.isFinite(subtotalPen)) throw new Error("El costo está fuera de rango.");
    return {
      partName: `[${part.chapter}] ${part.name} · ${material.name}`,
      materialCode: material.code,
      length: 0,
      width: 0,
      height: 0,
      quantity: row.quantity,
      total: row.quantity,
      wastePct: 0,
      unitPricePen: material.ref_price_pen,
      subtotalPen,
    };
  });
}
