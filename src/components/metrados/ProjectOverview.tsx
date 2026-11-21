"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, NumberField } from "@/components/ui";
import type { Project, Takeoff } from "@/lib/offline/db";
import { saveProject } from "@/lib/offline/repositories";
import { projectIndicators } from "@/lib/projects/indicators";
import { ProjectStageStepper } from "./ProjectStageStepper";

export function ProjectOverview({
  project,
  takeoffs,
  takeoffsHref,
  onEdit,
}: {
  project: Project;
  takeoffs: Takeoff[];
  takeoffsHref: string;
  onEdit: () => void;
}) {
  const [area, setArea] = useState<{ value: number | null; previous: string }>();
  const [status, setStatus] = useState("");
  const latest = useRef(0);
  const builtArea = area && area.previous === project.updatedAt ? area.value : project.builtArea;
  const indicators = projectIndicators({ builtArea, takeoffs });

  async function changeArea(value: number | null, empty: boolean) {
    const request = ++latest.current;
    setStatus("");
    if (value === null && !empty) return;
    setArea({ value, previous: project.updatedAt });
    try {
      await saveProject({ id: project.id, builtArea: value });
      if (request === latest.current) setStatus("Guardado");
    } catch {
      if (request === latest.current) {
        setArea(undefined);
        setStatus("No se pudo guardar el área.");
      }
    }
  }

  return (
    <>
      <Card className="project-overview">
        <div className="section-heading">
          <h3>Ficha de obra</h3>
          <Button size="sm" onClick={onEdit}>
            Editar ficha
          </Button>
        </div>
        <dl className="project-details">
          <div>
            <dt>Cliente</dt>
            <dd>{project.client || "Sin definir"}</dd>
          </div>
          <div>
            <dt>Ubicación</dt>
            <dd>{project.location || "Sin definir"}</dd>
          </div>
          <div>
            <dt>Tipología</dt>
            <dd>{project.typology || "Sin definir"}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{project.status}</dd>
          </div>
        </dl>
        <NumberField
          label="Área construida"
          unit="m²"
          placeholder="Ej. 120"
          min={0}
          max={9999999999.99}
          value={builtArea}
          onValueChange={(value, empty) => void changeArea(value, empty)}
        />
        <span className="small muted" role="status" aria-live="polite">
          {status}
        </span>
      </Card>
      <Card className="project-overview">
        <h3>Indicadores en tiempo real</h3>
        <dl className="project-details">
          <div>
            <dt>Área techada</dt>
            <dd>{indicators.area === null ? "Sin definir" : `${indicators.area} m²`}</dd>
          </div>
          <div>
            <dt>Costo total estimado</dt>
            <dd>
              {indicators.total === null ? "Sin partidas" : `S/ ${indicators.total.toFixed(2)}`}
            </dd>
          </div>
          <div>
            <dt>Ratio S/ por m²</dt>
            <dd>
              {indicators.costPerSquareMeter === null
                ? "Por calcular"
                : `S/ ${indicators.costPerSquareMeter.toFixed(2)}`}
            </dd>
          </div>
          <div>
            <dt>Partidas</dt>
            <dd>
              {indicators.count
                ? `${indicators.count} · ${indicators.chapters.join(", ")}`
                : "Sin partidas"}
            </dd>
          </div>
        </dl>
        {indicators.area === null && (
          <p>Indica el área construida para calcular el costo por m².</p>
        )}
        {!indicators.count && (
          <p>
            El costo por m² se calcula con tus partidas: total de partidas ÷ área construida.{" "}
            <Link href={takeoffsHref}>Ir a Metrados</Link>
          </p>
        )}
        <p className="muted small">
          Estimación referencial · materiales a precios Lima 2026, sin mano de obra
        </p>
      </Card>
      <ProjectStageStepper projectId={project.id} takeoffsCount={takeoffs.length} />
    </>
  );
}
