import { DEFAULT_MATERIAL_INPUT, type MaterialMode } from "@/data/rendimientos";
import type { Material } from "@/data/seed-rne";
import type { Takeoff } from "@/lib/offline/db";
import { computeMaterials } from "./materials/quantities";

interface RoomPart {
  id: MaterialMode;
  name: string;
  chapter: string;
  area: number;
}

export function rectangularRoomParts({
  length,
  width,
  height,
}: {
  length: number;
  width: number;
  height: number;
}): RoomPart[] {
  if (![length, width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Ingresa largo, ancho y altura mayores que cero.");
  }
  const floor = length * width;
  const walls = 2 * (length + width) * height;
  if (![floor, walls].every((area) => Number.isFinite(area) && area > 0)) {
    throw new Error("Las áreas están fuera de rango.");
  }
  return [
    { id: "muro", name: "Muro de perímetro", chapter: "Albañilería", area: walls },
    { id: "contrapiso", name: "Falso piso / contrapiso", chapter: "Pisos", area: floor },
    { id: "ceramico", name: "Acabado de piso", chapter: "Acabados", area: floor },
    { id: "losa", name: "Cubierta / losa", chapter: "Estructuras", area: floor },
  ];
}

export function roomPartTakeoffs(
  part: RoomPart,
  materials: readonly Material[],
): Omit<Takeoff, "id" | "projectId" | "updatedAt" | "syncState">[] {
  return computeMaterials(part.id, { ...DEFAULT_MATERIAL_INPUT, area: part.area }).map((row) => {
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
