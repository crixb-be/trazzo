"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Project, type Takeoff } from "@/lib/offline/db";
import { saveProject, saveTakeoff } from "@/lib/offline/repositories";
import { MATERIALS } from "@/data/seed-rne";
import { PARTIDAS } from "@/data/partidas";
import { DEFAULT_SLAB_THICKNESS_CM, recipePart, roomPartTakeoffs } from "@/lib/calculators/room";
import { shoppingList, chapterFor } from "@/lib/calculators/takeoff";
import { NumberField } from "@/components/ui";
import { SlabThicknessField } from "./SlabThicknessField";
export function TakeoffExtras({
  project,
  lines,
  canDuplicate,
  onDuplicate,
}: {
  project: Project;
  lines: Takeoff[];
  canDuplicate: boolean;
  onDuplicate: (p: Project) => void;
}) {
  const [area, setArea] = useState(10),
    [recipe, setRecipe] = useState(0),
    [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [slabThicknessCm, setSlabThicknessCm] = useState<number>(DEFAULT_SLAB_THICKNESS_CM);
  const selected = PARTIDAS[recipe];
  // Same validation as when adding: an invalid area or thickness disables the button.
  let recipeError = "";
  try {
    recipePart(selected, area, slabThicknessCm);
  } catch (cause) {
    recipeError = cause instanceof Error ? cause.message : "Revisa los datos de la receta.";
  }
  const options = useLiveQuery(() => db?.project_options.get(project.id), [project.id]);
  const gross = lines.reduce((s, l) => s + l.subtotalPen, 0);
  async function duplicate() {
    if (!canDuplicate || !db || busy) return;
    setBusy(true);
    try {
      const copy = await db.transaction(
        "rw",
        [db.projects, db.takeoffs, db.outbox, db.project_options],
        async () => {
          const p = await saveProject({
            ...project,
            id: undefined,
            name: project.name + " (copia)",
          });
          for (const l of lines) await saveTakeoff({ ...l, id: undefined, projectId: p.id });
          if (options) await db!.project_options.put({ ...options, projectId: p.id });
          return p;
        },
      );
      onDuplicate(copy);
      setNotice("Proyecto duplicado.");
    } catch {
      setNotice("No se pudo duplicar.");
    } finally {
      setBusy(false);
    }
  }
  async function addRecipe() {
    if (!db || busy || recipeError) return;
    setBusy(true);
    try {
      const rows = roomPartTakeoffs(recipePart(selected, area, slabThicknessCm), MATERIALS);
      await db.transaction("rw", [db.takeoffs, db.outbox], async () => {
        for (const row of rows) await saveTakeoff({ ...row, projectId: project.id });
      });
      setNotice("Receta agregada. Ajusta rendimientos específicos en Calculadoras → Materiales.");
    } catch {
      setNotice("No se pudo agregar la receta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card takeoff-extras">
      <h2>Planificar compras</h2>
      <button className="btn" disabled={!canDuplicate || busy} onClick={() => void duplicate()}>
        Duplicar proyecto
      </button>
      {!canDuplicate && <p>Tu plan no permite crear otro proyecto.</p>}
      <NumberField
        label="Área construida del proyecto"
        unit="m²"
        value={options?.area ?? 0}
        onValueChange={(v) => {
          void db?.project_options
            .put({ projectId: project.id, area: Math.max(0, v ?? 0) })
            .catch(() => setNotice("No se pudo guardar el área."));
        }}
      />
      <p>
        {options?.area
          ? `Ratio: S/ ${(gross / options.area).toFixed(2)} por m²`
          : "Indica el área para obtener el ratio por m². El área se guarda en este dispositivo."}
      </p>
      <h3>Partida con receta</h3>
      <p>
        Estimación referencial, merma de 5% incluida; precios editables en las partidas. Recetas de
        concreto y losa no sustituyen diseño estructural ni de mezcla.
      </p>
      <label>
        Receta
        <select className="input" value={recipe} onChange={(e) => setRecipe(+e.target.value)}>
          {PARTIDAS.map((p, i) => (
            <option value={i} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label="Área de partida"
        unit="m²"
        value={area}
        onValueChange={(v) => setArea(v ?? NaN)}
      />
      {selected.id === "contrapiso" && (
        <SlabThicknessField value={slabThicknessCm} onChange={setSlabThicknessCm} />
      )}
      {recipeError && <p role="status">{recipeError}</p>}
      <button className="btn" disabled={busy || !!recipeError} onClick={() => void addRecipe()}>
        Agregar receta al proyecto
      </button>
      <h3>Capítulos</h3>
      {[...new Set(lines.map((l) => chapterFor(l.partName)))].map((c) => (
        <p key={c}>
          {c}: S/{" "}
          {lines
            .filter((l) => chapterFor(l.partName) === c)
            .reduce((s, l) => s + l.subtotalPen, 0)
            .toFixed(2)}
        </p>
      ))}
      <h3>Lista de compras</h3>
      {shoppingList(lines).map((r) => {
        const m = MATERIALS.find((m) => m.code === r.code);
        return (
          <p key={r.code}>
            {m?.name ?? r.code}: {r.quantity.toFixed(3)} {m?.unit} · S/ {r.cost.toFixed(2)}
          </p>
        );
      })}
      <p role="status">{notice}</p>
    </section>
  );
}
