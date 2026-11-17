"use client";
import { useState } from "react";
import { NumberField } from "@/components/ui";
import { UNITS, convertUnits, fractionInches, scalePlan, type Unit } from "@/lib/calculators/units";
import { computeSlope } from "@/lib/calculators/slope";
import { polygonArea } from "@/lib/calculators/area";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { fieldToolResultSheet } from "@/lib/share/workspace-sheets";

const TOOL_LABELS: Record<string, string> = {
  unidades: "Conversor de unidades",
  pendiente: "Pendientes",
  area: "Terreno irregular",
  escala: "Escala de planos",
};

export function FieldTools() {
  const [tool, setTool] = useState("unidades");
  const [value, setValue] = useState(1);
  const [from, setFrom] = useState<Unit>("m");
  const [to, setTo] = useState<Unit>("cm");
  const [slopeUnit, setSlopeUnit] = useState<"porcentaje" | "grados" | "relación">("porcentaje");
  const [scale, setScale] = useState(100);
  const [direction, setDirection] = useState<"real" | "plano">("real");
  const [vertices, setVertices] = useState("0,0\n10,0\n10,8\n0,8");
  let result = "";
  let error = "";
  try {
    if (tool === "unidades")
      result =
        convertUnits(value, from, to).toLocaleString("es-PE", { maximumFractionDigits: 8 }) +
        " " +
        to;
    if (tool === "pendiente") {
      const r = computeSlope(value, slopeUnit);
      result = `${r.percent.toFixed(3)} % · ${r.degrees.toFixed(3)}° · ${r.denominator === null ? "Horizontal" : "1:" + r.denominator.toFixed(3)}`;
    }
    if (tool === "escala")
      result =
        scalePlan(value, scale, direction).toFixed(4) +
        (direction === "real" ? " m reales" : " cm en plano");
    if (tool === "area") {
      const p = vertices
        .trim()
        .split("\n")
        .map((line) => {
          const parts = line.split(",");
          if (parts.length !== 2 || parts.some((s) => !s.trim()))
            throw new Error("Cada línea debe contener X,Y en metros, con punto decimal.");
          return { x: Number(parts[0]), y: Number(parts[1]) };
        });
      result = polygonArea(p).toFixed(3) + " m²";
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const sheet =
    !error && result
      ? fieldToolResultSheet({
          toolLabel: TOOL_LABELS[tool] ?? "Utilidad de campo",
          result,
          notes: [
            "Resultado geométrico o de conversión; revisa unidades, escala y datos de campo antes de usarlo.",
          ],
        })
      : null;
  return (
    <section>
      <h2>Utilidades de campo</h2>
      <label>
        Herramienta
        <select className="input" value={tool} onChange={(e) => setTool(e.target.value)}>
          {Object.entries({
            unidades: "Conversor",
            pendiente: "Pendientes",
            area: "Terreno irregular",
            escala: "Escala de planos",
          }).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {tool !== "area" && (
        <NumberField
          label={
            tool === "escala"
              ? direction === "real"
                ? "Longitud en plano (cm)"
                : "Longitud real (m)"
              : "Valor"
          }
          value={value}
          allowNegative={tool === "unidades"}
          onValueChange={(v) => setValue(v ?? NaN)}
        />
      )}
      {tool === "unidades" && (
        <>
          <div className="field-grid">
            <label>
              Desde
              <select
                className="input"
                value={from}
                onChange={(e) => {
                  const u = e.target.value as Unit;
                  setFrom(u);
                  setTo(u);
                }}
              >
                {Object.entries(UNITS).map(([u, v]) => (
                  <option key={u} value={u}>
                    {u} · {v.group}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hasta
              <select className="input" value={to} onChange={(e) => setTo(e.target.value as Unit)}>
                {Object.keys(UNITS)
                  .filter((u) => UNITS[u as Unit].group === UNITS[from].group)
                  .map((u) => (
                    <option key={u}>{u}</option>
                  ))}
              </select>
            </label>
          </div>
          <label>
            Pulgadas de fierro / tubería
            <select
              className="input"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  setValue(fractionInches(e.target.value));
                  setFrom("pulgada");
                  setTo("mm");
                }
              }}
            >
              <option value="">Seleccionar fracción</option>
              {["1/4", "3/8", "1/2", "5/8", "3/4", "1", "3/2", "2", "3", "4"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <p>
            Conversión geométrica. En tuberías la medida nominal no equivale al diámetro exterior;
            consulta la serie y ficha del fabricante.
          </p>
        </>
      )}
      {tool === "pendiente" && (
        <label>
          Unidad de entrada
          <select
            className="input"
            value={slopeUnit}
            onChange={(e) => setSlopeUnit(e.target.value as typeof slopeUnit)}
          >
            <option value="porcentaje">Porcentaje</option>
            <option value="grados">Grados</option>
            <option value="relación">Relación 1:n (introducir n)</option>
          </select>
        </label>
      )}
      {tool === "escala" && (
        <>
          <NumberField label="Escala 1:n" value={scale} onValueChange={(v) => setScale(v ?? NaN)} />
          <label>
            Sentido
            <select
              className="input"
              value={direction}
              onChange={(e) => setDirection(e.target.value as typeof direction)}
            >
              <option value="real">Plano → realidad</option>
              <option value="plano">Realidad → plano</option>
            </select>
          </label>
        </>
      )}
      {tool === "area" && (
        <label>
          Vértices X,Y (m), uno por línea, en orden del contorno
          <textarea
            className="input"
            rows={8}
            value={vertices}
            onChange={(e) => setVertices(e.target.value)}
          />
          <span>
            No repitas el primero al final. Usa punto decimal; las longitudes de lados solas no
            determinan el área.
          </span>
        </label>
      )}
      <div className="card" role="status">
        {error || result}
      </div>
      {sheet && (
        <div className="hero-actions" aria-label="Acciones del resultado de campo">
          <ShareResult sheet={sheet} />
          <SaveToProject sheet={sheet} />
        </div>
      )}
    </section>
  );
}
