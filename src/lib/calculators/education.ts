import {
  A040_FIXTURE_RATIOS,
  A040_OCCUPANCY,
  MINEDU208_FREE_AREA,
  MINEDU208_LIBRARIES,
  MINEDU208_MAX_FLOORS,
  MINEDU208_ROOMS,
  type A040OccupancyUse,
  type TerrainType,
} from "@/data/norms/education";

export type EduLevel = "inicial" | "primaria" | "secundaria" | "superior";
export type EduRegime = "a040" | "minedu208";

export const EDU_LEVELS: Array<{ id: EduLevel; label: string }> = [
  { id: "inicial", label: "Inicial" },
  { id: "primaria", label: "Primaria" },
  { id: "secundaria", label: "Secundaria" },
  { id: "superior", label: "Superior" },
];

/** RVM 208-2019-MINEDU regulates primary and secondary schools only. */
export function minedu208Applies(level: EduLevel): boolean {
  return level === "primaria" || level === "secundaria";
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}: ingresa un número entero no negativo.`);
  }
}

function per(count: number, ratio: number): number {
  return count === 0 ? 0 : Math.ceil(count / ratio);
}

export interface StudentFixtures {
  men: { toilets: number; lavatories: number; urinals: number };
  women: { toilets: number; lavatories: number; urinals: number };
  /** Students counted per group (equal split, Art. 20.1; each half rounded up). */
  perGroup: number;
  ref: string;
}

/**
 * A.040 Art. 20, Cuadros N° 4–8. The count uses all students of the busiest shift
 * (Art. 20.3) split equally between men and women (Art. 20.1).
 */
export function a040StudentFixtures(level: EduLevel, students: number): StudentFixtures {
  assertCount(students, "Estudiantes");
  const perGroup = Math.ceil(students / 2);
  if (level === "inicial") {
    const r = A040_FIXTURE_RATIOS.inicial;
    return {
      perGroup,
      ref: "A.040 · Art. 20 · Cuadro N° 4",
      men: {
        toilets: per(perGroup, r.boys.toilets),
        lavatories: per(perGroup, r.boys.lavatories),
        urinals: per(perGroup, r.boys.urinals),
      },
      women: {
        toilets: per(perGroup, r.girls.toilets),
        lavatories: per(perGroup, r.girls.lavatories),
        urinals: 0,
      },
    };
  }
  const r = A040_FIXTURE_RATIOS.general;
  return {
    perGroup,
    ref: level === "superior" ? "A.040 · Art. 20 · Cuadro N° 7" : "A.040 · Art. 20 · Cuadro N° 4",
    men: {
      toilets: per(perGroup, r.men.toilets),
      lavatories: per(perGroup, r.men.lavatories),
      urinals: per(perGroup, r.men.urinals),
    },
    women: {
      toilets: per(perGroup, r.women.toilets),
      lavatories: per(perGroup, r.women.lavatories),
      urinals: 0,
    },
  };
}

/** A.040 Art. 13.2: occupants for exits and corridors, rounded up. */
export function a040Occupants(use: A040OccupancyUse, area: number): number {
  if (!Number.isFinite(area) || area < 0) throw new Error("Ingresa un área no negativa.");
  const row = A040_OCCUPANCY.find((item) => item.id === use);
  if (!row) throw new Error("Uso no encontrado en el Cuadro N° 3 de la A.040.");
  return Math.ceil(area / row.factor);
}

/** A.040 Art. 16.2: rooms with more than 50 occupants need two doors. */
export function a040DoorsRequired(occupants: number): number {
  assertCount(occupants, "Aforo");
  return occupants > 50 ? 2 : 1;
}

/** A.040 Art. 18: two stairs above one floor (one only under the listed exceptions). */
export function a040StairsRequired(floors: number): number {
  assertCount(floors, "Pisos");
  return floors > 1 ? 2 : 0;
}

/** RVM 208 · Cuadro N° 12 and num. 11.1.1 d): classroom area for a section. */
export function minedu208ClassroomArea(studentsPerSection: number, exceptional = false): number {
  assertCount(studentsPerSection, "Estudiantes por sección");
  const io = exceptional ? 1.67 : 2;
  return Math.round(studentsPerSection * io * 100) / 100;
}

export type LibraryResult =
  | { type: "I" | "II" | "III"; area: number; capacity: number; ref: string }
  | { type: null; reason: string; ref: string };

/** RVM 208 · num. 11.2.1 g) and Cuadro N° 13. */
export function minedu208Library(
  sections: number,
  level: "primaria" | "secundaria",
): LibraryResult {
  assertCount(sections, "Secciones");
  const ref = "MINEDU 208 · Cuadro N° 13 y num. 11.2.1";
  const minimum = level === "primaria" ? 6 : 5;
  if (sections < minimum) {
    return {
      type: null,
      ref,
      reason: `Con menos de ${minimum} secciones se aplican las «Normas para bibliotecas escolares».`,
    };
  }
  const pick = (type: "I" | "II" | "III") => {
    const lib = MINEDU208_LIBRARIES.find((l) => l.type === type)!;
    return { type, area: lib.area, capacity: lib.capacity, ref };
  };
  if (sections <= 30) return pick("I");
  if (sections <= 48) return pick("II");
  if (sections > 49) return pick("III");
  return {
    type: null,
    ref,
    reason:
      "La norma asigna Tipo II hasta 48 secciones y Tipo III a «más de 49»; no precisa el caso de 49 secciones.",
  };
}

export interface SumResult {
  area: number;
  rule: "tope-300" | "minimo-taller";
  ref: string;
}

/** RVM 208 · Cuadro N° 22: 1.00 m² per student of the busiest shift. */
export function minedu208Sum(students: number, sections: number): SumResult {
  assertCount(students, "Estudiantes");
  assertCount(sections, "Secciones");
  const ref = "MINEDU 208 · Cuadro N° 22";
  const raw = students * 1;
  if (sections >= 5) return { area: Math.min(raw, 300), rule: "tope-300", ref };
  // Under 5 sections the SUM may not be smaller than a workshop or laboratory (90.00 m²).
  const workshop = MINEDU208_ROOMS.find((room) => room.id === "laboratorio")!.area;
  return { area: Math.max(raw, workshop), rule: "minimo-taller", ref };
}

/** RVM 208 · Cuadro N° 7: minimum free area for the intervention area. */
export function minedu208FreeArea(terrain: TerrainType, interventionArea: number): number {
  if (!Number.isFinite(interventionArea) || interventionArea < 0) {
    throw new Error("Ingresa un área de terreno no negativa.");
  }
  return Math.round(interventionArea * MINEDU208_FREE_AREA[terrain] * 100) / 100;
}

/** RVM 208 · Cuadro N° 6: public schools, up to four floors. */
export function minedu208FloorsOk(floors: number): boolean {
  assertCount(floors, "Pisos");
  return floors <= MINEDU208_MAX_FLOORS;
}
