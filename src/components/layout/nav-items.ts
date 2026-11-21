import { BookOpen, Calculator, DraftingCompass, FolderOpen, Home, NotebookPen } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Inicio", mobileLabel: "Inicio", icon: Home, match: ["/"] },
  {
    href: "/normativa",
    label: "Normativa",
    mobileLabel: "Normas",
    icon: BookOpen,
    match: ["/normativa", "/medidas"],
  },
  {
    href: "/calculadoras",
    label: "Calculadoras",
    mobileLabel: "Calcular",
    icon: Calculator,
    match: ["/calculadoras"],
  },
  {
    href: "/metrados",
    label: "Proyectos",
    mobileLabel: "Proyectos",
    icon: FolderOpen,
    match: ["/metrados"],
  },
  {
    href: "/bitacora",
    label: "Bitácora",
    mobileLabel: "Bitácora",
    icon: NotebookPen,
    match: ["/bitacora"],
  },
  {
    href: "/estudio",
    label: "Estudio",
    mobileLabel: "Estudio",
    icon: DraftingCompass,
    match: ["/estudio", "/matriz", "/honorarios"],
  },
] as const;

export function matchesNavItem(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}
