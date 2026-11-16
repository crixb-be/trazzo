"use client";

import { BookOpen, Calculator, FolderOpen, Home, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Five destinations fit a 360 px screen with readable labels. "Proyectos" covers
// metrados and honorarios; the account lives in the header avatar.
const items = [
  { href: "/", label: "Inicio", icon: Home, match: ["/"] },
  { href: "/normativa", label: "Normas", icon: BookOpen, match: ["/normativa"] },
  { href: "/calculadoras", label: "Calcular", icon: Calculator, match: ["/calculadoras"] },
  { href: "/metrados", label: "Proyectos", icon: FolderOpen, match: ["/metrados", "/honorarios"] },
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
