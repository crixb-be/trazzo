"use client";

import { useState } from "react";
import { Button, NumberField } from "@/components/ui";
import { MATERIALS } from "@/data/seed-rne";
import {
  DEFAULT_SLAB_THICKNESS_CM,
  SLAB_THICKNESS_PRESETS,
  rectangularRoomParts,
  roomPartTakeoffs,
} from "@/lib/calculators/room";
import { db } from "@/lib/offline/db";
import { saveTakeoff } from "@/lib/offline/repositories";

const dimensions = [
  ["length", "Largo"],
  ["width", "Ancho"],
  ["height", "Altura"],
] as const;

export function QuickRoomGenerator({ projectId }: { projectId: string }) {
  const [size, setSize] = useState({ length: 4, width: 3, height: 2.6 });
  const [slabThicknessCm, setSlabThicknessCm] = useState<number>(DEFAULT_SLAB_THICKNESS_CM);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  let parts: ReturnType<typeof rectangularRoomParts> = [];
  let error = "";
  try {
    parts = rectangularRoomParts({ ...size, slabThicknessCm });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Revisa las dimensiones.";
  }

  async function addParts() {
    const local = db;
    if (!local || busy || !parts.length) return;
    setBusy(true);
    setNotice("");
    try {
      const drafts = parts.flatMap((part) => roomPartTakeoffs(part, MATERIALS));
      await local.transaction("rw", [local.projects, local.takeoffs, local.outbox], async () => {
        if (!(await local.projects.get(projectId)))
          throw new Error("El proyecto ya no está disponible.");
        for (const draft of drafts) await saveTakeoff({ ...draft, projectId });
      });
      setNotice(`Se agregaron 4 partidas con ${drafts.length} líneas de materiales.`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo agregar el ambiente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card quick-room-generator">
      <summary>Generar ambiente rectangular rápido</summary>
      <div className="field-grid">
        {dimensions.map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            unit="m"
            value={size[key]}
            onValueChange={(value) => setSize((previous) => ({ ...previous, [key]: value ?? NaN }))}
          />
        ))}
      </div>
      <NumberField
        id="quick-room-slab-thickness"
        label="Espesor falso piso / contrapiso"
        unit="cm"
        value={slabThicknessCm}
        onValueChange={(value) => setSlabThicknessCm(value ?? NaN)}
      />
      <div className="site-log-chips" role="group" aria-label="Espesores frecuentes">
        {SLAB_THICKNESS_PRESETS.map(({ cm, label }) => (
          <button
            type="button"
            className="btn btn-sm"
            key={cm}
            aria-pressed={slabThicknessCm === cm}
            onClick={() => setSlabThicknessCm(cm)}
          >
            {cm} cm {label.toLowerCase()}
          </button>
        ))}
      </div>
      {error ? (
        <p role="status">{error}</p>
      ) : (
        <dl className="site-log-metrics" aria-label="Áreas del ambiente">
          {parts.map((part) => (
            <div key={part.id}>
              <dt>{part.name}</dt>
              <dd>{part.area.toLocaleString("es-PE", { maximumFractionDigits: 3 })} m²</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="muted small">
        El cálculo considera el perímetro completo, incluidos vanos. La losa requiere diseño
        estructural.
      </p>
      <Button type="button" disabled={busy || !!error} onClick={() => void addParts()}>
        Agregar 4 partidas
      </Button>
      <p role="status">{notice}</p>
    </details>
  );
}
