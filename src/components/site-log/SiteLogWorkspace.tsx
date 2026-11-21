"use client";

import { NotebookPen, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button, Card, confirmDialog } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { useProjectList } from "@/lib/offline/hooks";
import { useSiteLog, useSiteLogs } from "@/lib/offline/site-logs";
import { VISIT_TYPES } from "@/lib/projects/site-log";
import { SiteLogEditor } from "./SiteLogEditor";

function visitUrl(projectId: string | null, logId?: string) {
  const query = new URLSearchParams();
  if (projectId) query.set("project", projectId);
  if (logId) query.set("log", logId);
  return "/bitacora" + (query.size ? "?" + query : "");
}

export function SiteLogWorkspace() {
  const params = useSearchParams();
  const logId = params.get("log");
  const projectId = params.get("project");
  const [filter, setFilter] = useState<{ context: string | null; project: string | null }>();
  const projectFilter = filter?.context === projectId ? filter.project : projectId;
  const [draftKey, setDraftKey] = useState(0);
  const logs = useSiteLogs(projectFilter ?? undefined);
  const log = useSiteLog(logId);
  const projects = useProjectList();
  const dirty = useRef(false);
  const onDirtyChange = useCallback((changed: boolean) => {
    dirty.current = changed;
  }, []);

  async function navigate(path: string) {
    if (
      dirty.current &&
      !(await confirmDialog({
        title: "¿Descartar los cambios de la visita?",
        confirmLabel: "Descartar cambios",
      }))
    )
      return;
    if (path === visitUrl(projectId, logId ?? undefined)) setDraftKey((key) => key + 1);
    else window.history.pushState(null, "", path);
  }

  return (
    <div className="site-log-page">
      <header>
        <h1 className="page-title">Bitácora de obra</h1>
        <p className="lead">Registra visitas, acuerdos y fotos de obra por proyecto.</p>
      </header>
      {projects === undefined ? (
        <LoadingState label="Cargando visitas…" />
      ) : (
        <div className="site-log-layout">
          <Card className="site-log-list">
            <div className="site-log-actions">
              <h2>Visitas registradas</h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void navigate(visitUrl(projectFilter))}
              >
                <Plus size={16} aria-hidden="true" /> Nueva visita
              </Button>
            </div>
            <label>
              Filtrar por proyecto
              <select
                className="input"
                value={projectFilter ?? ""}
                onChange={(event) =>
                  setFilter({ context: projectId, project: event.target.value || null })
                }
              >
                <option value="">Todos los proyectos</option>
                {projectFilter && !projects.some((project) => project.id === projectFilter) && (
                  <option value={projectFilter}>Proyecto eliminado</option>
                )}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            {logs.length ? (
              <ul role="list" aria-label="Visitas de obra">
                {logs.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-current={logId === entry.id ? "true" : undefined}
                      onClick={() => void navigate(visitUrl(projectId, entry.id))}
                    >
                      <NotebookPen size={18} aria-hidden="true" />
                      <span>
                        <strong>{VISIT_TYPES[entry.visitType]}</strong>
                        <small>
                          {entry.projectId
                            ? (projects.find((project) => project.id === entry.projectId)?.name ??
                              "Proyecto eliminado")
                            : "Sin proyecto"}
                        </small>
                      </span>
                      <time className="mono small" dateTime={entry.visitDate}>
                        {entry.visitDate.split("-").reverse().join("/")}
                      </time>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Aún no hay visitas registradas.</p>
            )}
          </Card>
          {logId && log === undefined ? (
            <LoadingState label="Cargando visita…" />
          ) : logId && !log ? (
            <Card>
              <p>Esta visita ya no está disponible.</p>
            </Card>
          ) : (
            <SiteLogEditor
              key={(logId ?? "new:" + (projectId ?? "")) + ":" + draftKey}
              log={logId ? (log ?? null) : null}
              projectId={projects.some((project) => project.id === projectId) ? projectId : null}
              projects={projects}
              onDirtyChange={onDirtyChange}
              onSaved={(id) => {
                if (id !== logId) window.history.replaceState(null, "", visitUrl(projectId, id));
              }}
              onDeleted={() => window.history.replaceState(null, "", visitUrl(projectId))}
            />
          )}
        </div>
      )}
    </div>
  );
}
