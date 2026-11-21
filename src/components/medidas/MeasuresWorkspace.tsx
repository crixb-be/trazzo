"use client";
import { Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { SectorFilters } from "@/components/normativa/SectorFilters";
import { codesForSector, matchesSector, SECTORS, type SectorId } from "@/lib/normativa/sectors";
import { MEASURES } from "@/data/medidas";
import { AccessFilterMenu } from "@/components/ui/AccessFilterMenu";
import { PocketDiagram } from "@/components/svg-diagrams/PocketDiagram";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { measureResultSheet } from "@/lib/share/workspace-sheets";
import { MEASURE_FAMILY, familyOf } from "@/lib/ui/families";
import { toggleFavorite, useLibraryActivity } from "@/lib/offline/library";
import { matchesAccessFilter, measureFavoriteKey, type AccessFilter } from "@/lib/ui/access-filter";
const measureCodes = new Set(MEASURES.map(({ norm_code }) => norm_code));
const measureSectors = [
  ...SECTORS.filter(
    ({ id, codes }) => id === "todos" || codes.some((code) => measureCodes.has(code)),
  ),
  { id: "referencias", label: "Referencias de diseño" } as const,
];

export function MeasuresWorkspace({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("Todas");
  const [sector, setSector] = useState<SectorId | "referencias">("todos");
  const [normCode, setNormCode] = useState("Todos");
  const [access, setAccess] = useState<AccessFilter>("todas");
  const activity = useLibraryActivity();
  const favorites = new Set(activity.filter((a) => a.favorite).map((a) => a.slug));
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const matches = MEASURES.filter(
    (m) =>
      (category === "Todas" || category === m.category) &&
      (sector === "todos" ||
        (sector === "referencias"
          ? !m.norm_code
          : Boolean(m.norm_code && matchesSector(sector, m.norm_code)))) &&
      (normCode === "Todos" || normCode === m.norm_code) &&
      // Pocket measures are all free reference content.
      matchesAccessFilter(access, {
        isPro: false,
        favorite: favorites.has(measureFavoriteKey(m.id)),
      }) &&
      normalize([m.title, m.note, m.norm_code, m.article].join(" ")).includes(normalize(query)),
  );
  return (
    <div className="measures-page">
      <div className="eyebrow">Referencias / Anteproyecto</div>
      <h1 className="page-title">Medidas de bolsillo</h1>
      <p className="lead">
        Referencias de diseño y medidas normativas para anteproyecto. Cada ficha indica su estado de
        verificación.
      </p>
      <div className="measures-toolbar">
        <div className="field">
          <label htmlFor="measures-query">Buscar medidas</label>
          <input
            id="measures-query"
            className="input"
            value={query}
            placeholder="Persona, baño, clóset…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="measures-category">Categoría</label>
          <select
            id="measures-category"
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "Todas",
              "Antropometría",
              "Mobiliario",
              "Ambientes",
              "Montaje",
              "Salud",
              "Educación",
              "Servicios Comunales",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <AccessFilterMenu value={access} onChange={setAccess} />
      </div>
      <SectorFilters
        options={measureSectors}
        sector={sector}
        onSectorChange={(next) => {
          if (next === sector) return;
          setSector(next);
          setNormCode("Todos");
        }}
        codes={
          sector === "todos" || sector === "referencias"
            ? []
            : codesForSector(sector).filter((code) => measureCodes.has(code))
        }
        normCode={normCode}
        onNormChange={setNormCode}
      />
      <p className="result-count mono" role="status">
        {matches.length} fichas
      </p>
      <div className="measure-grid">
        {matches.map((m) => (
          <article className="card measure-card" key={m.id}>
            <div className="measure-card-head">
              <Badge variant="norma" family={familyOf(MEASURE_FAMILY, m.category)}>
                {m.category}
              </Badge>
              <VerificationBadge source={m} />
              <button
                type="button"
                className="icon-btn measure-favorite"
                aria-pressed={favorites.has(measureFavoriteKey(m.id))}
                aria-label={
                  (favorites.has(measureFavoriteKey(m.id))
                    ? "Quitar de favoritas: "
                    : "Guardar en favoritas: ") + m.title
                }
                onClick={() => void toggleFavorite(measureFavoriteKey(m.id))}
              >
                <Star size={16} aria-hidden="true" />
              </button>
            </div>
            <h2>{m.title}</h2>
            <div className="measure-diagram">
              <PocketDiagram measure={m} />
            </div>
            <p className="measure-note">{m.note}</p>
            <small className="muted">
              {m.norm_code
                ? [m.norm_code, m.article, m.source_resolution].filter(Boolean).join(" · ")
                : "Referencia de diseño · pendiente de fuente"}
            </small>
            <div className="measure-actions" aria-label={`Acciones de ${m.title}`}>
              <ShareResult sheet={measureResultSheet(m)} diagramScope=".measure-card" />
              <SaveToProject sheet={measureResultSheet(m)} />
            </div>
          </article>
        ))}
      </div>
      {!matches.length && (
        <p className="panel-empty muted">
          {access === "pro"
            ? "Las medidas de bolsillo son gratuitas: no hay contenido PRO en esta sección."
            : access === "favoritas"
              ? "Aún no tienes medidas favoritas. Toca la estrella de una ficha para guardarla."
              : "No hay medidas con ese filtro."}
        </p>
      )}
    </div>
  );
}
