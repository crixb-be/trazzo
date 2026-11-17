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
    <div>
      <h1 className="page-title">Medidas de bolsillo</h1>
      <p>
        Referencias para anteproyecto. Los módulos de ambientes no son mínimos normativos. Todas las
        fichas están por verificar con bibliografía.
      </p>
      <div className="field-grid">
        <label>
          Buscar medidas
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Categoría
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {["Todas", "Antropometría", "Mobiliario", "Ambientes", "Montaje"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">{matches.length} fichas</p>
      <div className="category-grid">
        {matches.map((m) => (
          <article className="card measure-card" key={m.id}>
            <span className="badge">Por verificar</span>
            <h2>{m.title}</h2>
            <PocketDiagram measure={m} />
            <p>{m.note}</p>
            <small>Referencia de diseño · pendiente de fuente · {m.category}</small>
            <div className="hero-actions" aria-label={`Acciones de ${m.title}`}>
              <ShareResult sheet={measureResultSheet(m)} diagramScope=".measure-card" />
              <SaveToProject sheet={measureResultSheet(m)} />
            </div>
          </article>
        ))}
      </div>
      {!matches.length && <p>No hay medidas con ese filtro.</p>}
    </div>
  );
}
