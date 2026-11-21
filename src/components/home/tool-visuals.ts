import {
  Accessibility,
  BookOpen,
  Calculator,
  Car,
  FolderOpen,
  Footprints,
  Ruler,
  ShieldCheck,
  ShowerHead,
  type LucideIcon,
} from "lucide-react";
import { DISCIPLINE_FAMILY, familyOf, type Family } from "@/lib/ui/families";

export const HOME_SHORTCUTS = [
  {
    href: "/calculadoras",
    title: "Calculadoras técnicas",
    detail: "Cálculos de diseño y obra",
    icon: Calculator,
    family: "pizarra",
  },
  {
    href: "/metrados",
    title: "Proyectos de obra",
    detail: "Partidas y compras",
    icon: FolderOpen,
    family: "terracota",
  },
  {
    href: "/normativa",
    title: "Normativa RNE",
    detail: "Fichas por disciplina",
    icon: BookOpen,
    family: "arena",
  },
  {
    href: "/normativa?tab=medidas",
    title: "Medidas de bolsillo",
    detail: "Mobiliario y ambientes",
    icon: Ruler,
    family: "salvia",
  },
] as const satisfies readonly {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  family: Family;
}[];

const DISCIPLINE_ICONS: Record<string, LucideIcon> = {
  Accesibilidad: Accessibility,
  Circulación: Footprints,
  Seguridad: ShieldCheck,
  Sanitarias: ShowerHead,
  Estacionamientos: Car,
};

export function disciplineVisual(name: string): { icon: LucideIcon; family: Family } {
  return {
    icon: DISCIPLINE_ICONS[name] ?? BookOpen,
    family: familyOf(DISCIPLINE_FAMILY, name),
  };
}
