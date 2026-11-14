"use client";

import Link from "next/link";
import {
  BookOpen,
  Calculator,
  ChevronRight,
  ClipboardList,
  Home,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/normativa", label: "Normativa", icon: BookOpen },
  { href: "/calculadoras", label: "Calculadoras", icon: Calculator },
  { href: "/metrados", label: "Metrados", icon: ClipboardList },
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
      <Link className="brand" href="/" aria-label="TRAZZO, volver al inicio">
        <span className="brand-mark">T</span>
        <span>
          <strong>TRAZZO</strong>
          <small>RNE PRO · PERÚ</small>
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
            {isActive(pathname, href) && <ChevronRight size={14} aria-hidden="true" />}
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
