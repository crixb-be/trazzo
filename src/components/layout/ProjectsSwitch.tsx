"use client";

import { Briefcase, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/metrados", label: "Metrados", icon: ClipboardList },
  { href: "/honorarios", label: "Honorarios", icon: Briefcase },
] as const;

/** Metrados and Honorarios share the "Proyectos" tab; this switches between them. */
export function ProjectsSwitch() {
  const pathname = usePathname();
  return (
    <nav className="projects-switch" aria-label="Secciones de proyectos">
      {sections.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
