"use client";

import { workspaceStorageKey } from "@/lib/offline/workspace-storage";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Briefcase, ClipboardList, IdCard, Network, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { loadCustomFeeRates } from "@/lib/offline/fee-rates";
import { getStudioProfile } from "@/lib/offline/profile";
import {
  CHECKLIST_GROUPS,
  EXPEDIENTE_CHECKLIST_KEY,
  checklistProgress,
  parseChecklist,
  serializeChecklist,
  type CheckedItems,
} from "@/lib/studio/checklist";

const tools = [
  {
    href: "/bitacora",
    title: "Bitácora de obra",
    description: "Registra visitas y exporta actas e informes con fotos.",
    icon: NotebookPen,
    family: "arena",
  },
  {
    href: "/matriz",
    title: "Matriz de Relaciones Ponderadas",
    description: "Lámina diagonal de anteproyecto.",
    icon: Network,
    family: "pizarra",
  },
  {
    href: "/honorarios",
    title: "Honorarios y Propuestas",
    description: "Prepara propuestas económicas y contratos con el membrete del estudio.",
    icon: Briefcase,
    family: "terracota",
  },
] as const;

export function StudioWorkspace() {
  const [checked, setChecked] = useState<CheckedItems>(() => new Set());
  const studio = useLiveQuery(async () => {
    try {
      const [profile, customRates] = await Promise.all([getStudioProfile(), loadCustomFeeRates()]);
      return { profile, hasCustomRates: customRates !== null };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      setChecked(
        parseChecklist(localStorage.getItem(workspaceStorageKey(EXPEDIENTE_CHECKLIST_KEY))),
      );
    } catch {
      // La lista se puede usar durante la visita aunque el almacenamiento esté bloqueado.
    }
  }, []);

  function updateChecklist(next: CheckedItems) {
    setChecked(next);
    try {
      localStorage.setItem(workspaceStorageKey(EXPEDIENTE_CHECKLIST_KEY), serializeChecklist(next));
    } catch {
      // Las marcas siguen disponibles mientras la página esté abierta.
    }
  }

  const progress = checklistProgress(checked);

  return (
    <div className="studio-page">
      <header>
        <div className="eyebrow">Herramientas del estudio</div>
        <h1 className="page-title">Estudio profesional</h1>
        <p className="lead">
          Organiza anteproyectos, expedientes y propuestas de tu práctica profesional.
        </p>
      </header>

      <div className="studio-grid">
        {tools.map(({ href, title, description, icon: Icon, family }) => (
          <Link
            key={href}
            className={
              "surface-card studio-card studio-tool" +
              (href === "/bitacora" ? " site-log-featured" : "")
            }
            href={href}
            data-family={family}
          >
            <span className="tile-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <h2>{title}</h2>
              <p className="muted">{description}</p>
            </div>
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        ))}

        <Card
          className="surface-card studio-card studio-checklist"
          aria-labelledby="studio-checklist-title"
        >
          <div className="studio-card-heading" data-family="salvia">
            <span className="tile-icon" aria-hidden="true">
              <ClipboardList size={20} />
            </span>
            <h2 id="studio-checklist-title">Checklist de Expediente RNE</h2>
          </div>
          <div className="studio-checklist-summary">
            <span>
              {progress.completed} de {progress.total} verificados
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={progress.completed === 0}
              onClick={() => updateChecklist(new Set())}
            >
              Reiniciar
            </Button>
          </div>
          <progress
            value={progress.completed}
            max={progress.total}
            aria-label="Progreso total del expediente RNE"
          />

          {CHECKLIST_GROUPS.map(({ name, code, items }) => {
            const group = checklistProgress(checked, items);
            return (
              <fieldset key={name} className="studio-checklist-group">
                <legend>{name}</legend>
                <p className="muted small">
                  {code} · {group.completed} de {group.total} verificados
                </p>
                {items.map(({ id, label }) => (
                  <label className="studio-checklist-item" key={id}>
                    <input
                      type="checkbox"
                      checked={checked.has(id)}
                      onChange={(event) => {
                        const next = new Set(checked);
                        if (event.target.checked) next.add(id);
                        else next.delete(id);
                        updateChecklist(next);
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </Card>

        <Card
          className="surface-card studio-card studio-identity"
          aria-labelledby="studio-identity-title"
        >
          <div className="studio-card-heading" data-family="arena">
            <span className="tile-icon" aria-hidden="true">
              <IdCard size={20} />
            </span>
            <h2 id="studio-identity-title">Identidad y Tarifario del Estudio</h2>
          </div>
          {studio === undefined ? (
            <p className="muted">Cargando datos del estudio…</p>
          ) : studio === null ? (
            <p className="muted">No se pudo leer la información del estudio en este dispositivo.</p>
          ) : (
            <dl className="studio-details">
              <dt>Estudio</dt>
              <dd>{studio.profile.studioName.trim() || "Por registrar"}</dd>
              <dt>CAP</dt>
              <dd>{studio.profile.capNumber.trim() || "Por registrar"}</dd>
              <dt>RUC</dt>
              <dd>{studio.profile.ruc.trim() || "Por registrar"}</dd>
              <dt>Tarifario</dt>
              <dd>{studio.hasCustomRates ? "Personalizado" : "Base"}</dd>
            </dl>
          )}
          <div className="inline-actions">
            <Link className="btn btn-sm" href="/cuenta#datos-estudio">
              Editar datos del estudio
            </Link>
            <Link className="btn btn-sm" href="/honorarios">
              Tarifario base
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
