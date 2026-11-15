"use client";

import { BookOpen, Briefcase, Calculator, ClipboardList, Home, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/", "Inicio", Home],
  ["/normativa", "Normativa", BookOpen],
  ["/calculadoras", "Calcular", Calculator],
  ["/metrados", "Metrados", ClipboardList],
  ["/honorarios", "Honorarios", Briefcase],
  ["/asistente", "IA", MessageSquare],
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {items.map(([href, label, Icon]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
