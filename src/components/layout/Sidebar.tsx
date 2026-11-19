"use client";

import Link from "next/link";
import {
  BookOpen,
  Calculator,
  Briefcase,
  ClipboardList,
  Home,
  MessageSquare,
  Ruler,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/normativa", label: "Normativa", icon: BookOpen },
  { href: "/medidas", label: "Medidas", icon: Ruler },
  { href: "/matriz", label: "Matriz de relaciones", icon: ClipboardList },
  { href: "/calculadoras", label: "Calculadoras", icon: Calculator },
  { href: "/metrados", label: "Metrados", icon: ClipboardList },
  { href: "/honorarios", label: "Honorarios", icon: Briefcase },
  { href: "/asistente", label: "Asistente", icon: MessageSquare },
  { href: "/cuenta", label: "Cuenta", icon: UserRound },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <Link className="brand" href="/" aria-label="TRAZO, volver al inicio">
        <BrandMark />
        <span>
          <strong>TRAZO</strong>
          <small>Del estudio a la obra</small>
        </span>
      </Link>

      <nav className="sidebar-nav">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(pathname, href) ? "active" : undefined}
            aria-current={isActive(pathname, href) ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="mono small">RNE / 2026</span>
        <span className="muted small">Trabajo local primero</span>
      </div>
    </aside>
  );
}
