"use client";
import { Star } from "lucide-react";
import { useState } from "react";
import { MEASURES } from "@/data/medidas";
import { AccessFilterMenu } from "@/components/ui/AccessFilterMenu";
import { PocketDiagram } from "@/components/svg-diagrams/PocketDiagram";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { measureResultSheet } from "@/lib/share/workspace-sheets";
import { MEASURE_FAMILY, familyOf } from "@/lib/ui/families";
import { toggleFavorite, useLibraryActivity } from "@/lib/offline/library";
import { matchesAccessFilter, measureFavoriteKey, type AccessFilter } from "@/lib/ui/access-filter";
export function MeasuresWorkspace({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("Todas");
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
      // Pocket measures are all free reference content.
      matchesAccessFilter(access, {
        isPro: false,
        favorite: favorites.has(measureFavoriteKey(m.id)),
      }) &&
      normalize(m.title + " " + m.note).includes(normalize(query)),
  );
  return (
    <div className="measures-page">
      <div className="eyebrow">Referencias / Anteproyecto</div>
      <h1 className="page-title">Medidas de bolsillo</h1>
      <p className="lead">
        Referencias para anteproyecto. Los módulos de ambientes no son mínimos normativos. Todas las
        fichas están por verificar con bibliografía.
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
            {["Todas", "Antropometría", "Mobiliario", "Ambientes", "Montaje"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <AccessFilterMenu value={access} onChange={setAccess} />
      </div>
      <p className="result-count mono" role="status">
        {matches.length} fichas
      </p>
      <div className="measure-grid">
        {matches.map((m) => (
          <article className="card measure-card" key={m.id}>
            <div className="measure-card-head">
              <span
                className="badge badge-norma"
                data-family={familyOf(MEASURE_FAMILY, m.category)}
              >
                {m.category}
              </span>
              <span className="badge badge-por-verificar">Por verificar</span>
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
            <small className="muted">Referencia de diseño · pendiente de fuente</small>
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
