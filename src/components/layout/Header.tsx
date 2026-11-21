"use client";

import { Sparkles, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleSearchShortcut } from "@/lib/ui/search-shortcut";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  "/metrados": "Proyectos de obra",
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  // Where focus returns when the search palette closes.
  const returnFocus = useRef<HTMLElement | null>(null);
  // Own photo (synced from profiles) first; the sign-in provider's photo as fallback.
  const avatar = useAccountAvatar();

  useEffect(() => setPortalTarget(document.body), []);

  // Close the search palette whenever the route changes.
  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  // The top bar has no search button: Ctrl/Cmd+K (or "/") opens the palette.
  useEffect(() => {
    function openSearch(event: KeyboardEvent): void {
      if (searchOpen) return;
      handleSearchShortcut(event, () => {
        returnFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setSearchOpen(true);
      });
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen || !portalTarget) return;
    const previousOverflow = portalTarget.style.overflow;
    portalTarget.style.overflow = "hidden";
    return () => {
      portalTarget.style.overflow = previousOverflow;
    };
  }, [searchOpen, portalTarget]);

  function dismissSearch() {
    setSearchOpen(false);
    returnFocus.current?.focus({ preventScroll: true });
    returnFocus.current = null;
  }

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

      {searchOpen &&
        portalTarget &&
        createPortal(
          <>
            <div className="mobile-search-backdrop" aria-hidden="true" onClick={dismissSearch} />
            <div
              className="mobile-search-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Buscar en el RNE"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                  dismissSearch();
                  return;
                }
                if (event.key !== "Tab") return;
                const controls = event.currentTarget.querySelectorAll<HTMLElement>("input, button");
                const first = controls[0];
                const last = controls[controls.length - 1];
                const edge = event.shiftKey ? first : last;
                if (event.target !== edge) return;
                event.preventDefault();
                (event.shiftKey ? last : first)?.focus();
              }}
            >
              <GlobalSearch autoFocus onDismiss={dismissSearch} />
              <button
                className="icon-btn"
                type="button"
                onClick={dismissSearch}
                aria-label="Cerrar búsqueda"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          </>,
          portalTarget,
        )}
    </header>
  );
}
