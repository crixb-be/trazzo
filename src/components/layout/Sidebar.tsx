"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";

import { matchesNavItem, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <Link className="brand" href="/" aria-label="TRAZZO, volver al inicio">
        <BrandMark />
        <span>
          <strong>TRAZZO</strong>
          <small>Del estudio a la obra</small>
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            className={matchesNavItem(pathname, match) ? "active" : undefined}
            aria-current={matchesNavItem(pathname, match) ? "page" : undefined}
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
