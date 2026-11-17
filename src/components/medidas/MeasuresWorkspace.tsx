"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MEASURES } from "@/data/medidas";
import { PocketDiagram } from "@/components/svg-diagrams/PocketDiagram";
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
        Teoría y referencia arquitectónica internacional · no es normativa peruana. La antropometría
        con fuente se identifica por página y figura. Los módulos de mobiliario y ambientes sin
        fuente son plantillas ilustrativas de TRAZZO, no mínimos legales ni medidas extraídas de
        Neufert.
      </p>
      <Link href="/biblioteca">Fuentes: Neufert y Ching / consultar RNE por separado</Link>
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
          <article className="card" key={m.id}>
            <span className="badge">
              {m.source ? "Referencia internacional documentada" : "Plantilla ilustrativa TRAZZO"}
            </span>
            <h2>{m.title}</h2>
            <PocketDiagram measure={m} />
            <p>{m.note}</p>
            <small>
              {m.source ?? "Ejemplo de diseño, sin atribución bibliográfica"} · {m.category}
            </small>
          </article>
        ))}
      </div>
      {!matches.length && <p>No hay medidas con ese filtro.</p>}
    </div>
  );
}
