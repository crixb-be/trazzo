import {
  BookOpen,
  BrickWall,
  Briefcase,
  ClipboardList,
  DoorOpen,
  Droplets,
  LandPlot,
  Network,
  Ruler,
  Sun,
  Users,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Colour families of TRAZO (tokens in src/styles/families.css):
 * arena = normativa and circulation, salvia = design, pizarra = calculation,
 * terracota = safety and site work, piedra = everything else.
 */
export type Family = "arena" | "salvia" | "pizarra" | "terracota" | "piedra";

type IconComponent = LucideIcon | ComponentType<LucideProps>;

/** Lucide has no stair: a three-step flight drawn on the same 24 px grid and stroke. */
function StairsIcon({ size = 24, strokeWidth = 2, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 20h5v-5h5v-5h5V5h3" />
      <path d="M3 20h18" />
    </svg>
  );
}

/** A ramp in section: the incline over its run, with the rise at the far end. */
function RampIcon({ size = 24, strokeWidth = 2, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 19 21 9v10Z" />
      <path d="M7 6h4" />
      <path d="m9 4 2 2-2 2" />
    </svg>
  );
}

const TOOL_VISUALS: Record<string, { icon: IconComponent; family: Family }> = {
  medidas: { icon: Ruler, family: "salvia" },
  matriz: { icon: Network, family: "salvia" },
  cabida: { icon: LandPlot, family: "salvia" },
  escaleras: { icon: StairsIcon, family: "pizarra" },
  rampas: { icon: RampIcon, family: "pizarra" },
  agua: { icon: Droplets, family: "pizarra" },
  pozos: { icon: Sun, family: "pizarra" },
  materiales: { icon: BrickWall, family: "pizarra" },
  utilidades: { icon: Wrench, family: "pizarra" },
  evacuacion: { icon: DoorOpen, family: "terracota" },
  aforo: { icon: Users, family: "terracota" },
  honorarios: { icon: Briefcase, family: "terracota" },
  metrados: { icon: ClipboardList, family: "terracota" },
};

export function toolVisual(id: string): { icon: IconComponent; family: Family } {
  return TOOL_VISUALS[id] ?? { icon: BookOpen, family: "piedra" };
}

/** RNE disciplines share the same families as the tools that use them. */
export const DISCIPLINE_FAMILY: Record<string, Family> = {
  Accesibilidad: "salvia",
  Circulación: "arena",
  Seguridad: "terracota",
  Sanitarias: "pizarra",
  Estacionamientos: "piedra",
};

/**
 * Columns and wide tiles so the last row is never left half empty.
 * Up to 4 tools sit on one row; 5–6 use 3 columns; 7–8 use 4. When the count does not
 * fill the grid, the first tools take two columns (they are the user's first picks).
 */
export function tileLayout(count: number): { columns: number; wide: number; wideMobile: number } {
  const columns = count <= 4 ? Math.max(count, 1) : count <= 6 ? 3 : 4;
  const wide = (columns - (count % columns)) % columns;
  // Phones show two columns: an odd count gets its first tool across the full width.
  const wideMobile = count % 2;
  return { columns, wide, wideMobile };
}
