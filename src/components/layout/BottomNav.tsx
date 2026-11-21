"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { matchesNavItem, NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {NAV_ITEMS.map(({ href, mobileLabel, icon: Icon, match }) => {
        const active = matchesNavItem(pathname, match);
        return (
          <Link
            href={href}
            key={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
