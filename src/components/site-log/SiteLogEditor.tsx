"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Card, confirmDialog, toast } from "@/components/ui";
import type { Project, SiteLog, SiteLogTopic, SiteVisitType } from "@/lib/offline/db";
import { deleteSiteLog, saveSiteLog, type SiteLogDraft } from "@/lib/offline/site-logs";
import { getStudioProfile } from "@/lib/offline/profile";
import { canExportPdf } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { SITE_LOG_SECTIONS, SITE_LOG_TOPICS, VISIT_TYPES } from "@/lib/projects/site-log";
import {
  clearSiteLogDraft,
  readSiteLogDraft,
  siteLogDraftKey,
  storeSiteLogDraft,
  type SiteLogEdit,
} from "@/lib/projects/site-log-drafts";
import { appendTranscript } from "@/lib/speech/dictation";
import { DictationButton } from "./DictationButton";
import { SiteLogPhotos } from "./SiteLogPhotos";

const visitTypes = Object.keys(VISIT_TYPES) as SiteVisitType[];
const topics = Object.keys(SITE_LOG_TOPICS) as SiteLogTopic[];
const fields = Object.keys(SITE_LOG_SECTIONS) as Array<keyof typeof SITE_LOG_SECTIONS>;

function newVisit(projectId: string | null): SiteLogDraft {
  return {
    projectId,
    visitType: "visita",
    visitDate: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    attendees: "",
    workStatus: "",
    findings: "",
    orders: "",
    followUp: "",
    topics: [],
    photos: [],
  };
}

export function SiteLogEditor({
  log,
  projectId,
  projects,
  onSaved,
  onDeleted,
}: {
  log: SiteLog | null;
  projectId: string | null;
  projects: Project[];
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const groupId = useId();
  const { plan } = useCurrentPlan();
  const [initial] = useState(() => newVisit(projectId));
  const [saved, setSaved] = useState<SiteLog | null>(null);
  const draftKey = siteLogDraftKey(log?.id, projectId);
  const [edit, setEdit] = useState<SiteLogEdit | null>(null);
  const [recovered, setRecovered] = useState(false);
  const pending = useRef<SiteLogEdit | null>(null);
  const timer = useRef<number>(undefined);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const latest =
    saved && (!log || Date.parse(saved.updatedAt) >= Date.parse(log.updatedAt)) ? saved : log;
  const draft = edit?.draft ?? latest ?? initial;
  const dirty = edit !== null;
  const selectedProject = projects.find((project) => project.id === draft.projectId);

  function change(update: (previous: SiteLogDraft) => SiteLogDraft) {
    setEdit((current) => ({
      draft: update(current?.draft ?? draft),
      version: current ? current.version : latest?.updatedAt,
    }));
  }

  function setField<K extends keyof SiteLogDraft>(field: K, value: SiteLogDraft[K]) {
    change((previous) => ({ ...previous, [field]: value }));
  }

  useEffect(() => {
    const restored = readSiteLogDraft(draftKey);
    if (restored) {
      setEdit(restored);
      setRecovered(true);
    }
    function flush() {
      if (pending.current) storeSiteLogDraft(draftKey, pending.current);
      pending.current = null;
    }
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timer.current);
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [draftKey]);

  useEffect(() => {
    if (!edit) return;
    pending.current = edit;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (pending.current) storeSiteLogDraft(draftKey, pending.current);
      pending.current = null;
    }, 400);
  }, [draftKey, edit]);

  function discard() {
    window.clearTimeout(timer.current);
    pending.current = null;
    clearSiteLogDraft(draftKey);
    setEdit(null);
    setRecovered(false);
  }

  async function save() {
    setBusy(true);
    try {
      const row = await saveSiteLog({ ...draft, id: latest?.id }, edit?.version);
      setSaved(row);
      discard();
      onSaved(row.id);
      toast("Visita guardada.", "ok");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "No se pudo guardar la visita.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!latest) return;
    setBusy(true);
    try {
      if (
        !(await confirmDialog({
          title: "¿Eliminar esta visita?",
          message: "Se eliminarán el registro y sus fotos.",
          confirmLabel: "Eliminar visita",
          danger: true,
        }))
      )
        return;
      await deleteSiteLog(latest.id);
      discard();
      onDeleted();
      toast("Visita eliminada.", "ok");
    } catch {
      toast("No se pudo eliminar la visita.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    if (!latest || dirty) return;
    setBusy(true);
    try {
      const [{ exportSiteLogPdf }, studio] = await Promise.all([
        import("@/lib/pdf/export-site-log"),
        getStudioProfile(),
      ]);
      await exportSiteLogPdf(latest, selectedProject ?? null, studio, !canExportPdf(plan));
    } catch {
      toast("No se pudo exportar el informe PDF.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="site-log-editor">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !photoBusy && (dirty || !latest)) void save();
        }}
      >
        <div className="site-log-actions">
          <h2>{latest ? "Editar visita" : "Nueva visita"}</h2>
          <span className="muted small" role="status">
            {dirty ? "Cambios sin guardar" : latest ? "Guardado" : ""}
          </span>
        </div>
        {recovered && (
          <div className="inline-actions">
            <span role="status">Recuperamos cambios sin guardar</span>
            <Button type="button" size="sm" variant="ghost" onClick={discard}>
              Descartar
            </Button>
          </div>
        )}
        <fieldset className="site-log-form" disabled={busy || photoBusy}>
          <fieldset className="site-log-visit-types">
            <legend>Tipo de visita</legend>
            <div className="site-log-segments">
              {visitTypes.map((type) => (
                <label key={type}>
                  <input
                    type="radio"
                    name={groupId + "-visit"}
                    checked={draft.visitType === type}
                    onChange={() => setField("visitType", type)}
                  />
                  <span>{VISIT_TYPES[type]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field-grid">
            <label>
              Fecha de visita
              <input
                className="input"
                type="date"
                required
                value={draft.visitDate}
                onChange={(event) => setField("visitDate", event.target.value)}
              />
            </label>
            <label>
              Proyecto
              <select
                className="input"
                value={draft.projectId ?? ""}
                onChange={(event) => setField("projectId", event.target.value || null)}
              >
                <option value="">Sin proyecto</option>
                {draft.projectId && selectedProject?.status !== "activo" && (
                  <option value={draft.projectId}>
                    {selectedProject?.name ?? "Proyecto eliminado"}
                  </option>
                )}
                {projects
                  .filter((project) => project.status === "activo")
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label>
            Asistentes
            <input
              className="input"
              value={draft.attendees}
              onChange={(event) => setField("attendees", event.target.value)}
            />
          </label>
          {fields.map((field) => {
            const label = SITE_LOG_SECTIONS[field];
            const id = groupId + "-" + field;
            return (
              <div key={field}>
                <div className="site-log-actions">
                  <label htmlFor={id}>{label}</label>
                  <DictationButton
                    label={label}
                    onTranscript={(spoken) =>
                      change((previous) => ({
                        ...previous,
                        [field]: appendTranscript(previous[field], spoken),
                      }))
                    }
                  />
                </div>
                <textarea
                  id={id}
                  className="input"
                  rows={3}
                  value={draft[field]}
                  onChange={(event) => setField(field, event.target.value)}
                />
              </div>
            );
          })}
          <fieldset>
            <legend>Temas tratados</legend>
            <div className="site-log-chips">
              {topics.map((topic) => (
                <button
                  type="button"
                  className="btn btn-sm"
                  key={topic}
                  aria-pressed={draft.topics.includes(topic)}
                  onClick={() =>
                    change((previous) => ({
                      ...previous,
                      topics: previous.topics.includes(topic)
                        ? previous.topics.filter((item) => item !== topic)
                        : [...previous.topics, topic],
                    }))
                  }
                >
                  {SITE_LOG_TOPICS[topic]}
                </button>
              ))}
            </div>
          </fieldset>
          <SiteLogPhotos
            photos={draft.photos}
            busy={photoBusy}
            onBusyChange={setPhotoBusy}
            onChange={(update) =>
              change((previous) => ({ ...previous, photos: update(previous.photos) }))
            }
          />
        </fieldset>
        <div className="site-log-actions site-log-editor-footer">
          <Button type="submit" disabled={busy || photoBusy || (!!latest && !dirty)}>
            Guardar
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!latest || dirty || busy || photoBusy}
            onClick={() => void exportPdf()}
          >
            <Download size={16} aria-hidden="true" /> Exportar Informe PDF
          </Button>
          {dirty && !recovered && (
            <Button type="button" variant="ghost" disabled={busy || photoBusy} onClick={discard}>
              Descartar cambios
            </Button>
          )}
          {latest && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy || photoBusy}
              onClick={() => void remove()}
            >
              <Trash2 size={16} aria-hidden="true" /> Eliminar visita
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
