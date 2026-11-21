"use client";

import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AccessFilterMenu,
  Badge,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingState,
  PaywallModal,
} from "@/components/ui";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { useLibraryActivity } from "@/lib/offline/library";
import {
  codesForSector,
  matchesSector,
  sectorOfCode,
  SECTORS,
  type SectorId,
} from "@/lib/normativa/sectors";
import { SectorFilters } from "./SectorFilters";
import { useCards } from "@/lib/offline/hooks";
import { ensureSeeded } from "@/lib/offline/db";
import { canUseProCards } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { searchCards } from "@/lib/search/search";
import { DISCIPLINE_FAMILY, familyOf } from "@/lib/ui/families";
import { matchesAccessFilter, parseAccessFilter, type AccessFilter } from "@/lib/ui/access-filter";

export function NormativaCatalog() {
  const cards = useCards();
  const activity = useLibraryActivity();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("cat") ?? "Todas";
  const requestedSector = searchParams.get("sector");
  const requestedNorm = searchParams.get("norm");
  const sector =
    SECTORS.find(({ id }) => id === requestedSector)?.id ??
    (requestedNorm ? sectorOfCode(requestedNorm) : undefined) ??
    "todos";
  const normCode =
    sector !== "todos" && requestedNorm && codesForSector(sector).includes(requestedNorm)
      ? requestedNorm
      : "Todos";
  const access = parseAccessFilter(searchParams);
  const { plan } = useCurrentPlan();
  const [paywall, setPaywall] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void ensureSeeded()
      .then(() => setLoaded(true))
      .catch(() => {
        setLoaded(true);
        setLoadError("No se pudo abrir la biblioteca local. Recarga la aplicación.");
      });
  }, []);

  function syncUrl(next: {
    q?: string;
    cat?: string;
    sector?: SectorId;
    norm?: string;
    access?: AccessFilter;
  }): void {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.cat && next.cat !== "Todas") params.set("cat", next.cat);
    if (next.sector && next.sector !== "todos") params.set("sector", next.sector);
    if (next.norm && next.norm !== "Todos") params.set("norm", next.norm);
    if (next.access && next.access !== "todas") params.set("acceso", next.access);
    const value = params.toString();
    window.history.replaceState(null, "", value ? pathname + "?" + value : pathname);
  }

  const filteredCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      if (category !== "Todas" && card.category !== category) return false;
      if (!matchesSector(sector, card.norm_code)) return false;
      if (normCode !== "Todos" && card.norm_code !== normCode) return false;
      const favorite = activity.some((a) => a.slug === card.slug && a.favorite);
      if (!matchesAccessFilter(access, { isPro: Boolean(card.is_pro), favorite })) return false;
      return true;
    });
    return searchCards(filtered, query);
  }, [cards, category, sector, normCode, access, query, activity]);

  const hasFilters = Boolean(
    query || category !== "Todas" || sector !== "todos" || access !== "todas",
  );
  const hasProAccess = canUseProCards(plan);

  if (!loaded && cards.length === 0) {
    return <LoadingState label="Cargando fichas guardadas en este dispositivo…" rows={4} />;
  }

  if (loadError) {
    return <CatalogState message={loadError} error />;
  }

  return (
    <div className="catalog-page">
      <div className="eyebrow">Biblioteca / RNE</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Normativa para decidir</h1>
          <p className="lead">
            Fichas visuales con cota, contexto y letra chica. Todo el catálogo básico está
            disponible sin conexión.
          </p>
        </div>
        <div className="catalog-count mono">{filteredCards.length} resultados</div>
      </div>

      <div className="catalog-toolbar">
        <div className="search-box catalog-search">
          <Search size={17} aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              syncUrl({ q: next, cat: category, sector, norm: normCode, access });
            }}
            placeholder="Busca alfeizar, garganta, cochera…"
            aria-label="Buscar fichas normativas"
          />
        </div>
        <AccessFilterMenu
          value={access}
          onChange={(next) => {
            syncUrl({ q: query, cat: category, sector, norm: normCode, access: next });
          }}
        />
      </div>

      <SectorFilters
        options={SECTORS}
        sector={sector}
        onSectorChange={(next) => {
          if (next === sector) return;
          syncUrl({ q: query, cat: category, sector: next, access });
        }}
        codes={sector === "todos" ? [] : codesForSector(sector)}
        normCode={normCode}
        onNormChange={(next) => {
          syncUrl({ q: query, cat: category, sector, norm: next, access });
        }}
      />
      {hasFilters && (
        <div className="catalog-active-filters">
          {category !== "Todas" && (
            <Chip
              aria-label={`Quitar tema: ${category}`}
              onClick={() => {
                syncUrl({ q: query, sector, norm: normCode, access });
              }}
            >
              Tema: {category} ×
            </Chip>
          )}
          <button className="btn btn-sm" type="button" onClick={() => syncUrl({})}>
            Limpiar filtros
          </button>
        </div>
      )}

      {filteredCards.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No encontramos fichas"
          description="Prueba con una norma, un artículo o jerga de obra como garganta o vano."
        />
      ) : (
        <div className="norm-grid">
          {filteredCards.map((card) => {
            const locked = card.is_pro && !hasProAccess;
            return (
              <Card className={"normative-card " + (locked ? "is-locked" : "")} key={card.slug}>
                <div className="norm-card-top">
                  <span className="mono norm-code">{card.norm_code}</span>
                  <span className="mono muted small">{card.article}</span>
                </div>
                <div className="norm-card-body">
                  <div className="card-badges">
                    <Badge variant="norma" family={familyOf(DISCIPLINE_FAMILY, card.category)}>
                      {card.category}
                    </Badge>
                    {card.is_pro && (
                      <Badge variant="pro">
                        <Lock size={11} /> Pro
                      </Badge>
                    )}
                    <VerificationBadge source={card} />
                  </div>
                  <h2>{card.title}</h2>
                  <p>{card.summary}</p>
                </div>
                <div className="norm-card-footer">
                  <span className="norm-value mono">
                    {card.min_value ?? "—"} {card.unit}
                  </span>
                  {locked ? (
                    <button className="btn btn-sm" type="button" onClick={() => setPaywall(true)}>
                      <Lock size={14} /> Desbloquear
                    </button>
                  ) : (
                    <Link className="btn btn-sm" href={"/normativa/" + card.slug}>
                      Ver ficha
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {paywall && <PaywallModal onClose={() => setPaywall(false)} />}
    </div>
  );
}

function CatalogState({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className="state-panel">
      <div className={"state-spinner " + (error ? "error" : "")} />
      <p>{message}</p>
    </div>
  );
}
