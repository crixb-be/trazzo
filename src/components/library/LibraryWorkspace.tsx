"use client";
import { normalize } from "@/lib/search/normalize";
import { useState } from "react";
import Link from "next/link";
import documents from "@/data/rne/documents.json";
import definitions from "@/data/rne/definitions.json";
import articles from "@/data/rne/a130-articles.json";
import { SUPPORT_LIBRARY } from "@/data/library";
export function LibraryWorkspace() {
  const [query, setQuery] = useState("");
  const found = articles.filter((a) =>
    /^\d+$/.test(query.trim())
      ? a.article === +query
      : normalize(a.text).includes(normalize(query)),
  );
  return (
    <div>
      <h1>Biblioteca documental</h1>
      <section aria-label="Normativa peruana obligatoria">
        <h2>Normativa Peruana Obligatoria (RNE)</h2>
        <p>
          Índice de los 18 PDFs aportados. El contraste acredita correspondencia con estos archivos,
          no ausencia de modificatorias posteriores. IS.010-2025 contiene solo la modificatoria
          residencial; faltan el texto base y otras modificatorias sanitarias. Los PDFs A.120/A.010
          son reproducciones con anotaciones editoriales; se identifica el archivo exacto por hash.
        </p>
        <Link href="/normativa">Abrir fichas contrastadas</Link>
        {documents
          .filter((d) => d.category === "RNE obligatorio")
          .map((d) => (
            <details key={d.file}>
              <summary>
                {d.title} · {d.pages} páginas
              </summary>
              <p>Archivo del repositorio: {d.file}</p>
              <p>
                SHA-256: <code style={{ overflowWrap: "anywhere" }}>{d.sha256}</code>
              </p>
            </details>
          ))}
        <h3>G.040 · Definiciones del documento aportado</h3>
        {definitions.map((d) => (
          <details key={d.term}>
            <summary>
              {d.term} · página PDF {d.page}
            </summary>
            <p>{d.text}</p>
          </details>
        ))}
        <h3>A.130 · índice completo de artículos del PDF aportado</h3>
        <p>
          218 artículos; el texto extraído puede omitir tablas gráficas y ecuaciones. La página del
          PDF es la referencia para figuras y formato. No sustituye verificar la versión aplicable
          al proyecto.
        </p>
        <label>
          Buscar artículo o término
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <p role="status">{found.length} artículos</p>
        {found.map((a) => (
          <details key={a.article}>
            <summary>
              Artículo {a.article} · página PDF {a.page}
            </summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{a.text}</p>
          </details>
        ))}
      </section>
      <section aria-label="Teoría y referencia arquitectónica internacional">
        <h2>Teoría y Referencia Arquitectónica Internacional</h2>
        <p>
          Neufert y Ching son apoyo de diseño. Sus cotas, convenciones y normas extranjeras no se
          aplican como RNE. Índices reconocidos por OCR, con revisión visual de la lámina
          antropométrica; los dibujos de TRAZZO son propios.
        </p>
        {SUPPORT_LIBRARY.map((b) => (
          <article className="card" key={b.id}>
            <h3>{b.title}</h3>
            <p>
              {b.kind} · {b.pages} páginas PDF · índice en páginas {b.indexPages.join(", ")}
            </p>
            {b.topics.map((t) => (
              <div key={t.title}>
                <h4>{t.title}</h4>
                <p>
                  {t.note} · página PDF {t.pdfPage}
                </p>
              </div>
            ))}
          </article>
        ))}
        <Link href="/medidas">Consultar medidas y plantillas de diseño</Link>
      </section>
    </div>
  );
}
