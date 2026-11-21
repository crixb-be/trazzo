"use client";

import { Search, Sparkles, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { GlobalSearch, OfflineBadge, ThemeToggle } from "@/components/ui";
import { useAccountAvatar } from "@/lib/account/use-account-avatar";

import { matchesNavItem, NAV_ITEMS } from "./nav-items";

const titles: Record<string, string> = {
  "/": "Espacio de trabajo",
  "/matriz": "Matriz de relaciones",
  "/calculadoras": "Calculadoras técnicas",
  "/bitacora": "Bitácora de obra",
  "/estudio": "Estudio profesional",
  "/metrados": "Proyectos y metrados",
  "/honorarios": "Honorarios y propuestas",
  "/asistente": "Asistente IA",
  "/cuenta": "Cuenta y planes",
};

function pageTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/normativa/")) return "Ficha normativa";
  return NAV_ITEMS.find(({ href }) => href === pathname)?.label ?? "TRAZZO";
}

export function Header() {
  const pathname = usePathname();
  const assistantActive = matchesNavItem(pathname, ["/asistente"]);
  const accountActive = pathname.startsWith("/cuenta");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchTrigger = useRef<HTMLButtonElement>(null);
  // Own photo (synced from profiles) first; the sign-in provider's photo as fallback.
  const avatar = useAccountAvatar();

  // Close the mobile search sheet whenever the route changes.
  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    function openMobileSearch(event: KeyboardEvent): void {
      const shortcut =
        event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
      if (!shortcut || mobileSearchOpen || !mobileSearchTrigger.current?.getClientRects().length) {
        return;
      }
      event.preventDefault();
      setMobileSearchOpen(true);
    }
    window.addEventListener("keydown", openMobileSearch);
    return () => window.removeEventListener("keydown", openMobileSearch);
  }, [mobileSearchOpen]);

  return (
    <header className="header">
      <Link className="header-brand" href="/" aria-label="TRAZZO, volver al inicio">
        <BrandMark />
      </Link>
      <div className="header-title">
        <span className="eyebrow">TRAZZO</span>
        <strong>{pageTitle(pathname)}</strong>
      </div>
      <div className="header-actions">
        <OfflineBadge />
        <ThemeToggle />
        <GlobalSearch />
        <button
          ref={mobileSearchTrigger}
          className="icon-btn header-search-trigger"
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Buscar en el RNE"
          aria-expanded={mobileSearchOpen}
        >
          <Search size={17} aria-hidden="true" />
        </button>
        <Link
          className="icon-btn header-assistant"
          href="/asistente"
          aria-label="Abrir asistente IA"
          title="Asistente IA"
          aria-current={assistantActive ? "page" : undefined}
        >
          <Sparkles size={17} aria-hidden="true" />
        </Link>
        <Link
          className={accountActive ? "account-avatar active" : "account-avatar"}
          href="/cuenta"
          aria-label="Abrir cuenta y planes"
          title="Cuenta"
          aria-current={accountActive ? "page" : undefined}
        >
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
