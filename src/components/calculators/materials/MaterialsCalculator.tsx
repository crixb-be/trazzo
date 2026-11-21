"use client";
import { useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/ui";
import { MATERIALS } from "@/data/seed-rne";
import {
  CONCRETE_RECIPES,
  DEFAULT_MATERIAL_INPUT,
  MATERIAL_MODES,
  YIELD_DATE,
  type MaterialMode,
  type MaterialInput,
} from "@/data/rendimientos";
import { computeMaterials, steelKg } from "@/lib/calculators/materials/quantities";
import { useProjects } from "@/lib/offline/hooks";
import { db } from "@/lib/offline/db";
import { saveTakeoff } from "@/lib/offline/repositories";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { materialsResultSheet } from "@/lib/share/workspace-sheets";
const fields: Record<string, [string, string]> = {
  area: ["Área neta", "m²"],
  volume: ["Volumen", "m³"],
  thickness: ["Espesor", "m"],
  bags: ["Cemento por m³", "bolsas de 42.5 kg"],
  sand: ["Arena por m³", "m³"],
  stone: ["Piedra por m³", "m³"],
  brickLength: ["Largo del ladrillo", "m"],
  brickWidth: ["Ancho del ladrillo", "m"],
  brickHeight: ["Alto del ladrillo", "m"],
  joint: ["Junta", "m"],
  mortarRatio: ["Arena por parte de cemento", "partes en volumen"],
  dryFactor: ["Factor de volumen seco", ""],
  tileLength: ["Largo de pieza", "m"],
  tileWidth: ["Ancho de pieza", "m"],
  adhesive: ["Pegamento", "kg/m²"],
  bagKg: ["Peso de bolsa de pegamento", "kg"],
  coverage: ["Rendimiento por mano", "m²/galón"],
  coats: ["Manos", ""],
  barLength: ["Longitud de varilla", "m"],
  steelQuantity: ["Cantidad de entrada", "kg o varillas según sentido"],
  concretePerM2: ["Concreto por área de losa", "m³/m²"],
  roofBricks: ["Ladrillos de techo por área", "und/m²"],
  waste: ["Merma", "%"],
};
const modeFields: Record<MaterialMode, string[]> = {
  concreto: ["volume", "bags", "sand", "stone"],
  muro: ["area", "brickLength", "brickWidth", "brickHeight", "joint", "mortarRatio", "dryFactor"],
  tarrajeo: ["area", "thickness", "mortarRatio", "dryFactor"],
  contrapiso: ["area", "thickness", "mortarRatio", "dryFactor"],
  ceramico: ["area", "tileLength", "tileWidth", "adhesive", "bagKg"],
  porcelanato: ["area", "tileLength", "tileWidth", "adhesive", "bagKg"],
  pintura: ["area", "coverage", "coats"],
  acero: ["steelQuantity", "barLength"],
  losa: ["area", "concretePerM2", "roofBricks", "bags", "sand", "stone"],
};
export function MaterialsCalculator() {
  const [mode, setMode] = useState<MaterialMode>("concreto");
  const [p, setP] = useState(DEFAULT_MATERIAL_INPUT);
  const [project, setProject] = useState("");
  const projects = useProjects();
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  let error = "";
  let rows: ReturnType<typeof computeMaterials> = [];
  try {
    rows = computeMaterials(mode, p);
  } catch (e) {
    error = (e as Error).message;
  }
  const sheet =
    !error && rows.length
      ? materialsResultSheet({
          modeLabel: MATERIAL_MODES[mode],
          lines: rows.map((row) => {
            const material = MATERIALS.find((item) => item.code === row.code)!;
            return {
              name: material.name,
              quantity: row.quantity,
              unit: material.unit,
              pricePen: prices[row.code] ?? material.ref_price_pen,
            };
          }),
          notes: [
            `Rendimientos referenciales con fecha ${YIELD_DATE}.`,
            "Los precios son editables y referenciales; confirma la cotización local.",
          ],
        })
      : null;
  const signature = JSON.stringify([mode, p, project, prices]);
  async function send() {
    if (!db || error || !project || sending || sent === signature) return;
    setSending(true);
    try {
      await db.transaction("rw", [db.projects, db.takeoffs, db.outbox], async () => {
        if (!(await db!.projects.get(project))) throw new Error();
        for (const row of rows.filter((r) => r.quantity > 0)) {
          const m = MATERIALS.find((m) => m.code === row.code)!;
          const price = prices[row.code] ?? m.ref_price_pen;
          await saveTakeoff({
            projectId: project,
            partName: MATERIAL_MODES[mode] + " · " + m.name,
            materialCode: row.code,
            length: 0,
            width: 0,
            height: 0,
            quantity: row.quantity,
            wastePct: 0,
            total: row.quantity,
            unitPricePen: price,
            subtotalPen: Math.round(row.quantity * price * 100) / 100,
          });
        }
      });
      setSent(signature);
      setNotice("Cantidades enviadas al metrado, con merma ya incluida.");
    } catch {
      setNotice("No se pudo guardar. Verifica que el proyecto exista e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }
  return (
    <section>
      <h2>Materiales de obra</h2>
      <p>
        Rendimientos referenciales editables · {YIELD_DATE}. Precios del catálogo referenciales;
        confirma cotización local. Concreto y losa requieren diseño de mezcla y cálculo estructural.
        Se excluyen agua de amasado, acero de losa y encofrado.
      </p>
      <label>
        Trabajo
        <select
          className="input"
          value={mode}
          onChange={(e) => {
            const m = e.target.value as MaterialMode;
            setMode(m);
            setP({
              ...DEFAULT_MATERIAL_INPUT,
              thickness: m === "contrapiso" ? 0.05 : 0.015,
              tileLength: m === "porcelanato" ? 0.6 : 0.45,
              tileWidth: m === "porcelanato" ? 0.6 : 0.45,
            });
          }}
        >
          {Object.entries(MATERIAL_MODES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {mode === "concreto" && (
        <label>
          Resistencia objetivo (kg/cm²)
          <select
            className="input"
            defaultValue="210"
            onChange={(e) => setP({ ...p, ...CONCRETE_RECIPES[e.target.value] })}
          >
            {Object.keys(CONCRETE_RECIPES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      )}
      {mode === "muro" && (
        <label>
          Aparejo
          <select
            className="input"
            value={p.bond}
            onChange={(e) => setP({ ...p, bond: +e.target.value })}
          >
            {["Soga", "Cabeza", "Canto"].map((v, i) => (
              <option value={i} key={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === "acero" && (
        <div className="field-grid">
          <label>
            Diámetro
            <select
              className="input"
              value={p.diameter}
              onChange={(e) => setP({ ...p, diameter: +e.target.value })}
            >
              {[
                [9.525, '3/8"'],
                [12.7, '1/2"'],
                [15.875, '5/8"'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l} · {v} mm
                </option>
              ))}
            </select>
          </label>
          <label>
            Sentido
            <select
              className="input"
              value={p.steelDirection}
              onChange={(e) => setP({ ...p, steelDirection: +e.target.value })}
            >
              <option value="0">kg → varillas completas</option>
              <option value="1">varillas → kg</option>
            </select>
          </label>
        </div>
      )}
      <div className="field-grid">
        {[...modeFields[mode], "waste"].map((key) => (
          <NumberField
            key={key}
            label={fields[key][0]}
            unit={fields[key][1]}
            value={p[key as keyof MaterialInput]}
            onValueChange={(v) => setP({ ...p, [key]: v ?? NaN })}
          />
        ))}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <h3>Materiales estimados (merma incluida)</h3>
          {rows.map((r) => {
            const m = MATERIALS.find((m) => m.code === r.code)!;
            return (
              <div className="card" key={r.code}>
                <strong>
                  {m.name}: {r.quantity.toFixed(3)} {m.unit}
                </strong>
                <NumberField
                  label={"Precio unitario · " + m.name}
                  unit="S/"
                  value={prices[r.code] ?? m.ref_price_pen}
                  onValueChange={(v) => setPrices({ ...prices, [r.code]: Math.max(0, v ?? 0) })}
                />
              </div>
            );
          })}
          {mode === "acero" && (
            <p>
              Peso teórico de las varillas resultantes:{" "}
              {steelKg(p.diameter, p.barLength, rows[0].quantity).toFixed(2)} kg (ρ ≈ 7850 kg/m³).
            </p>
          )}
          {sheet && (
            <div className="hero-actions" aria-label="Acciones del resultado de materiales">
              <ShareResult sheet={sheet} />
              <SaveToProject sheet={sheet} />
            </div>
          )}
        </>
      )}
      <label>
        Proyecto de destino
        <select
          className="input"
          value={project}
          disabled={!projects}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="">{projects ? "Selecciona proyecto" : "Cargando proyectos…"}</option>
          {projects?.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {projects?.length === 0 && <Link href="/metrados">Crear proyecto</Link>}
      <button
        className="btn btn-primary"
        disabled={
          !!error || !project || sending || sent === signature || !rows.some((r) => r.quantity > 0)
        }
        onClick={() => void send()}
      >
        Enviar a metrado
      </button>
      <p role="status">{notice}</p>
    </section>
  );
}
