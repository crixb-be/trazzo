"use client";

import { Calculator, FileText, NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { formatPen } from "@/lib/calculators/fees";
import type { Project } from "@/lib/offline/db";
import { useSiteLogs } from "@/lib/offline/site-logs";
import { VISIT_TYPES } from "@/lib/projects/site-log";
import { ProjectPhotos } from "./ProjectPhotos";
import { deleteProjectNote, useProjectNotes, useProjectQuotes } from "@/lib/offline/project-hub";

/** What else belongs to the project besides its takeoffs: saved results and quotes. */
export function ProjectHub({ project }: { project: Project }) {
  const notes = useProjectNotes(project.id);
  const logs = useSiteLogs(project.id);
  const quotes = useProjectQuotes(project.id);

  return (
    <Card className="project-hub">
      <div className="eyebrow">Del proyecto</div>
      <h3>Cálculos guardados</h3>
      {notes.length === 0 ? (
        <p className="muted small">
          Usa «Guardar en proyecto» en cualquier <Link href="/calculadoras">calculadora</Link> para
          dejar aquí el resultado.
        </p>
      ) : (
        <ul className="project-hub-list">
          {notes.map((note) => (
            <li key={note.id}>
              <Calculator size={16} className="text-accent" aria-hidden="true" />
              <details>
                <summary>
                  <strong>{note.title}</strong>
                  <small className="mono">
                    {note.eyebrow} · {new Date(note.createdAt).toLocaleDateString("es-PE")}
                  </small>
                </summary>
                {note.subtitle && <p className="small">{note.subtitle}</p>}
                {note.rows.map((row) => (
                  <p className="small" key={row.label}>
                    {row.status === "ok" ? "✓ " : row.status === "fail" ? "✗ " : ""}
                    {row.label}: <span className="mono">{row.value}</span>
                  </p>
                ))}
                {note.notes.map((text) => (
                  <p className="small muted" key={text}>
                    {text}
                  </p>
                ))}
              </details>
              <button
                type="button"
                className="icon-btn"
                aria-label={"Quitar cálculo " + note.title}
                onClick={() => void deleteProjectNote(note.id)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Cotizaciones</h3>
      {quotes.length === 0 ? (
        <p className="muted small">
          Abre una cotización en <Link href="/honorarios">Honorarios</Link> y elige este proyecto
          para verla aquí.
        </p>
      ) : (
        <ul className="project-hub-list">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <FileText size={16} className="text-accent" aria-hidden="true" />
              <Link href={"/honorarios?quote=" + quote.id}>
                <strong>{quote.code}</strong>
                <small>{quote.clientName || "Sin cliente"}</small>
              </Link>
              <span className="mono">{formatPen(quote.totals.total)}</span>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="project-site-log-title">
        <div className="site-log-actions">
          <h3 id="project-site-log-title">Bitácora de obra</h3>
          <Link className="btn" href={"/bitacora?project=" + encodeURIComponent(project.id)}>
            Nueva visita
          </Link>
        </div>
        {logs.length ? (
          <ul className="project-hub-list">
            {logs.map((log) => (
              <li key={log.id}>
                <NotebookPen size={16} aria-hidden="true" />
                <Link href={"/bitacora?log=" + encodeURIComponent(log.id)}>
                  <strong>{VISIT_TYPES[log.visitType]}</strong>
                  <small>
                    <time dateTime={log.visitDate}>{log.visitDate}</time>
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Este proyecto aún no tiene visitas registradas.</p>
        )}
      </section>
      <ProjectPhotos project={project} />
    </Card>
  );
}
