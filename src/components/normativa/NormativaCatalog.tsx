"use client";

import Link from "next/link";
import { Lock, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { A090_CODE } from "@/data/norms/a090";
import { NTS113_CODE } from "@/data/norms/nts113";
import { useLibraryActivity } from "@/lib/offline/library";
import type { RneCategory } from "@/data/seed-rne";
import { useCards } from "@/lib/offline/hooks";
import { ensureSeeded } from "@/lib/offline/db";
import { canUseProCards } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { searchCards } from "@/lib/search/search";
import { DISCIPLINE_FAMILY, familyOf } from "@/lib/ui/families";
import { matchesAccessFilter, parseAccessFilter, type AccessFilter } from "@/lib/ui/access-filter";

const categories: Array<"Todas" | RneCategory> = [
  "Todas",
  "Accesibilidad",
  "Circulación",
  "Seguridad",
  "Sanitarias",
  "Estacionamientos",
  "Salud",
  "Servicios Comunales",
];
const normCodes = [
  "Todos",
  "A.010",
  "A.020",
  "A.070",
  "A.080",
  A090_CODE,
  "A.120",
  "A.130",
  "IS.010",
  "E.020",
  "E.060",
  NTS113_CODE,
];

export function NormativaCatalog() {
  const cards = useCards();
  const activity = useLibraryActivity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<"Todas" | RneCategory>(
    (searchParams.get("cat") as "Todas" | RneCategory) || "Todas",
  );
  const [normCode, setNormCode] = useState(searchParams.get("norm") ?? "Todos");
  const [access, setAccess] = useState<AccessFilter>(() => parseAccessFilter(searchParams));
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

  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    },
    [],
  );

  function syncUrl(next: { q?: string; cat?: string; norm?: string; access?: AccessFilter }): void {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.cat && next.cat !== "Todas") params.set("cat", next.cat);
    if (next.norm && next.norm !== "Todos") params.set("norm", next.norm);
    if (next.access && next.access !== "todas") params.set("acceso", next.access);
    const value = params.toString();
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      router.replace(value ? pathname + "?" + value : pathname, { scroll: false });
    }, 300);
  }

  const filteredCards = useMemo(() => {
    const filtered = cards.filter((card) => {
      if (category !== "Todas" && card.category !== category) return false;
      if (normCode !== "Todos" && card.norm_code !== normCode) return false;
      const favorite = activity.some((a) => a.slug === card.slug && a.favorite);
      if (!matchesAccessFilter(access, { isPro: Boolean(card.is_pro), favorite })) return false;
      return true;
    });
    return searchCards(filtered, query);
  }, [cards, category, normCode, access, query, activity]);

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
              setQuery(next);
              syncUrl({ q: next, cat: category, norm: normCode, access });
            }}
            placeholder="Busca alfeizar, garganta, cochera…"
            aria-label="Buscar fichas normativas"
          />
        </div>
        <AccessFilterMenu
          value={access}
          onChange={(next) => {
            setAccess(next);
            syncUrl({ q: query, cat: category, norm: normCode, access: next });
          }}
        />
      </div>

      <div className="filter-row">
        <SlidersHorizontal size={16} className="muted" aria-hidden="true" />
        {categories.map((item) => (
          <Chip
            active={category === item}
            key={item}
            onClick={() => {
              setCategory(item);
              syncUrl({ q: query, cat: item, norm: normCode, access });
            }}
          >
            {item}
          </Chip>
        ))}
      </div>

      <div className="norm-code-row">
        {normCodes.map((code) => (
          <button
            type="button"
            key={code}
            className={"norm-code-chip " + (normCode === code ? "active" : "")}
            onClick={() => {
              setNormCode(code);
              syncUrl({ q: query, cat: category, norm: code, access });
            }}
          >
            {code}
          </button>
        ))}
      </div>

      {filteredCards.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No encontramos fichas"
          description="Prueba con una norma, un artículo o jerga de obra como garganta o vano."
          action={
            <button
              className="btn"
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("Todas");
                setNormCode("Todos");
                setAccess("todas");
                if (urlTimer.current) clearTimeout(urlTimer.current);
                router.replace(pathname, { scroll: false });
              }}
            >
              Limpiar filtros
            </button>
          }
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
