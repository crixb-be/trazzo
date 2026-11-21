import { RNE_CARDS } from "@/data/seed-rne";

export const SECTORS = [
  { id: "todos", label: "Todos", codes: [] },
  { id: "general", label: "General", codes: ["A.010", "A.120", "A.130"] },
  { id: "vivienda", label: "Vivienda", codes: ["A.020"] },
  { id: "salud", label: "Salud", codes: ["NTS 113"] },
  { id: "educacion", label: "Educación", codes: ["A.040", "MINEDU 208"] },
  { id: "comercio-oficinas", label: "Comercio y Oficinas", codes: ["A.070", "A.080"] },
  { id: "servicios-comunales", label: "Servicios Comunales", codes: ["A.090"] },
  {
    id: "instalaciones",
    label: "Instalaciones y Estructuras",
    codes: ["IS.010", "E.020", "E.060"],
  },
] as const satisfies readonly { id: string; label: string; codes: readonly string[] }[];

export type SectorId = (typeof SECTORS)[number]["id"];

const allCodes = [...new Set(RNE_CARDS.map(({ norm_code }) => norm_code))];

export function sectorOfCode(code: string): SectorId | undefined {
  return SECTORS.find(({ codes }) => codes.some((candidate) => candidate === code))?.id;
}

export function codesForSector(id: SectorId): readonly string[] {
  return id === "todos" ? allCodes : (SECTORS.find((sector) => sector.id === id)?.codes ?? []);
}

export function matchesSector(id: SectorId, code: string): boolean {
  return id === "todos" || sectorOfCode(code) === id;
}
