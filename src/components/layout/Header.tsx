"use client";

import { Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { GlobalSearch, OfflineBadge, ThemeToggle } from "@/components/ui";
import { useAccountAvatar } from "@/lib/account/use-account-avatar";

const titles: Record<string, string> = {
  "/medidas": "Medidas de bolsillo",
  "/": "Espacio de trabajo",
  "/normativa": "Biblioteca RNE",
  "/matriz": "Matriz de relaciones",
  "/calculadoras": "Calculadoras técnicas",
  "/metrados": "Proyectos y metrados",
  "/honorarios": "Honorarios y propuestas",
  "/asistente": "Asistente RNE",
  "/cuenta": "Cuenta y planes",
};

function pageTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/normativa/")) return "Ficha normativa";
  return "TRAZO";
}

export function Header() {
  const pathname = usePathname();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // Own photo (synced from profiles) first; the sign-in provider's photo as fallback.
  const avatar = useAccountAvatar();

  // Close the mobile search sheet whenever the route changes.
  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  return (
    <header className="header">
      <Link className="header-brand" href="/" aria-label="TRAZO, volver al inicio">
        <BrandMark />
      </Link>
      <div className="header-title">
        <span className="eyebrow">TRAZO</span>
        <strong>{pageTitle(pathname)}</strong>
      </div>
      <div className="header-actions">
        <GlobalSearch />
        <button
          className="icon-btn header-search-trigger"
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Buscar en el RNE"
          aria-expanded={mobileSearchOpen}
        >
          <Search size={17} aria-hidden="true" />
        </button>
        <OfflineBadge />
        <ThemeToggle />
        <Link className="account-avatar" href="/cuenta" aria-label="Abrir cuenta">
          {avatar.src ? (
            // Own photo: a resized data URL. Provider photo: Google's CDN, sent without referrer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.src} alt="" referrerPolicy="no-referrer" />
          ) : (
            <UserRound size={17} aria-hidden="true" />
          )}
        </Link>
      </div>

      {mobileSearchOpen && (
        <div className="mobile-search-sheet" role="dialog" aria-label="Buscar en el RNE">
          <GlobalSearch autoFocus onDismiss={() => setMobileSearchOpen(false)} />
          <button
            className="icon-btn"
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            aria-label="Cerrar búsqueda"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </header>
  );
}
