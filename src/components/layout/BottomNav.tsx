"use client";

import {
  BookOpen,
  Calculator,
  DraftingCompass,
  FolderOpen,
  Home,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Estudio agrupa la matriz y los honorarios. La cuenta se abre desde la cabecera.
const items = [
  { href: "/", label: "Inicio", icon: Home, match: ["/"] },
  { href: "/normativa", label: "Normas", icon: BookOpen, match: ["/normativa"] },
  { href: "/calculadoras", label: "Calcular", icon: Calculator, match: ["/calculadoras"] },
  { href: "/metrados", label: "Proyectos", icon: FolderOpen, match: ["/metrados"] },
  {
    href: "/estudio",
    label: "Estudio",
    icon: DraftingCompass,
    match: ["/estudio", "/matriz", "/honorarios"],
  },
  { href: "/asistente", label: "Asistente", icon: MessageSquare, match: ["/asistente"] },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active =
          href === "/" ? pathname === "/" : match.some((prefix) => pathname.startsWith(prefix));
        return (
          <Link
            href={href}
            key={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
