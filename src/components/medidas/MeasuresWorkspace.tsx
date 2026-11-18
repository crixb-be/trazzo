"use client";
import { useEffect, useState } from "react";
import { MEASURES } from "@/data/medidas";
import { PocketDiagram } from "@/components/svg-diagrams/PocketDiagram";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { measureResultSheet } from "@/lib/share/workspace-sheets";
export function MeasuresWorkspace() {
  const [query, setQuery] = useState("");
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  const [category, setCategory] = useState("Todas");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const matches = MEASURES.filter(
    (m) =>
      (category === "Todas" || category === m.category) &&
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
      </div>
      <p className="result-count mono" role="status">
        {matches.length} fichas
      </p>
      <div className="measure-grid">
        {matches.map((m) => (
          <article className="card measure-card" key={m.id}>
            <div className="measure-card-head">
              <span className="badge badge-por-verificar">Por verificar</span>
              <span className="mono muted small">{m.category}</span>
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
      {!matches.length && <p className="panel-empty muted">No hay medidas con ese filtro.</p>}
    </div>
  );
}
