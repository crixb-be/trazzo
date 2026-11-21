"use client";
import { useState } from "react";
import { db } from "@/lib/offline/db";
import { saveTakeoff } from "@/lib/offline/repositories";
import { MATERIALS } from "@/data/seed-rne";
import { PARTIDAS } from "@/data/partidas";
import { DEFAULT_SLAB_THICKNESS_CM, recipePart, roomPartTakeoffs } from "@/lib/calculators/room";
import { NumberField } from "@/components/ui";
import { SlabThicknessField } from "./SlabThicknessField";
export function TakeoffExtras({ projectId }: { projectId: string }) {
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
  async function addRecipe() {
    if (!db || busy || recipeError) return;
    setBusy(true);
    try {
      const rows = roomPartTakeoffs(recipePart(selected, area, slabThicknessCm), MATERIALS);
      await db.transaction("rw", [db.takeoffs, db.outbox], async () => {
        for (const row of rows) await saveTakeoff({ ...row, projectId });
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
      <h2>Partida con receta</h2>
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
        value={Number.isFinite(area) ? area : null}
        onValueChange={(v) => setArea(v ?? NaN)}
      />
      {selected.id === "contrapiso" && (
        <SlabThicknessField value={slabThicknessCm} onChange={setSlabThicknessCm} />
      )}
      {recipeError && <p role="status">{recipeError}</p>}
      <button className="btn" disabled={busy || !!recipeError} onClick={() => void addRecipe()}>
        Agregar receta al proyecto
      </button>
      <p role="status">{notice}</p>
    </section>
  );
}
