"use client";
import { useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/ui";
import { OCCUPANCY_USES, computeOccupancy } from "@/lib/calculators/occupancy";
import { computeFixtures, type FixtureUse } from "@/lib/calculators/fixtures";
import { computeDaylight } from "@/lib/calculators/daylight";
import { accessibleParking } from "@/lib/calculators/accessible-parking";
import { CalculatorResult } from "./CalculatorResult";
export type RneTool = "aforo" | "sanitarios" | "luz" | "parking";
export function RneExtraCalculators({ tool }: { tool: RneTool }) {
  const [use, setUse] = useState<keyof typeof OCCUPANCY_USES>("oficina");
  const [area, setArea] = useState(95);
  const [factor, setFactor] = useState(9.5);
  const [fixtureUse, setFixtureUse] = useState<FixtureUse>("oficina");
  const [men, setMen] = useState(10);
  const [women, setWomen] = useState(10);
  const [light, setLight] = useState(10);
  const [vent, setVent] = useState(5);
  const [glass, setGlass] = useState(2);
  const [opening, setOpening] = useState(1);
  const [parking, setParking] = useState(20);
  let main = "",
    details = "",
    error = "";
  try {
    if (tool === "aforo") {
      main = computeOccupancy(area, factor) + " personas";
      details = `${area} m² / ${factor} m² por persona · ${OCCUPANCY_USES[use].ref}`;
    }
    if (tool === "sanitarios") {
      const m = computeFixtures(men, fixtureUse),
        w = computeFixtures(women, fixtureUse);
      main = `${m.toilets + w.toilets} inodoros estimados`;
      details = `Hombres: ${m.toilets} I, ${m.lavatories} L, ${m.urinals} U · Mujeres: ${w.toilets} I, ${w.lavatories} L. Poblaciones calculadas por separado.`;
    }
    if (tool === "luz") {
      const r = computeDaylight(area, light, vent, glass, opening);
      main = `${r.requiredGlazing.toFixed(2)} m² de iluminación`;
      details = `Apertura efectiva requerida ${r.requiredOpening.toFixed(2)} m² · vidrio: ${r.lightPass ? "alcanza" : "insuficiente"} · ventilación: ${r.ventPass ? "alcanza" : "insuficiente"}`;
    }
    if (tool === "parking") {
      main = accessibleParking(parking) + " plazas accesibles";
      details =
        "Reserva referencial A.120: 1–20: 1; 21–50: 2; 51–400: 2 por cada 50 o fracción; más de 400: 16 + 1 por cada 100 adicionales o fracción.";
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const titles = {
    aforo: "Aforo por uso",
    sanitarios: "Aparatos sanitarios por uso",
    luz: "Iluminación y ventilación natural",
    parking: "Estacionamientos accesibles",
  };
  return (
    <section>
      <h2>{titles[tool]}</h2>
      <p className="warning">
        Por verificar · referencias de anteproyecto, pendientes de contraste con el RNE vigente. No
        certifican cumplimiento. Confirma norma específica, artículo, modificaciones y población
        aplicable antes de usar en expediente.
      </p>
      {tool === "aforo" && (
        <>
          <label>
            Uso
            <select
              className="input"
              value={use}
              onChange={(e) => {
                const u = e.target.value as typeof use;
                setUse(u);
                setFactor(OCCUPANCY_USES[u].factor);
              }}
            >
              {Object.entries(OCCUPANCY_USES).map(([u, v]) => (
                <option value={u} key={u}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Factor de ocupación (editable)"
            unit="m²/persona"
            value={factor}
            onValueChange={(v) => setFactor(v ?? NaN)}
          />
          <p>
            Usa área útil del ambiente indicado, sin mezclar usos. En asientos fijos cuenta las
            plazas; suma aforos de ambientes independientes.
          </p>
        </>
      )}
      {(tool === "aforo" || tool === "luz") && (
        <NumberField
          label="Área útil del ambiente"
          unit="m²"
          value={area}
          onValueChange={(v) => setArea(v ?? NaN)}
        />
      )}
      {tool === "sanitarios" && (
        <>
          <label>
            Uso
            <select
              className="input"
              value={fixtureUse}
              onChange={(e) => setFixtureUse(e.target.value as FixtureUse)}
            >
              {["oficina", "comercio", "restaurante"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <div className="field-grid">
            <NumberField
              label="Población masculina"
              value={men}
              onValueChange={(v) => setMen(v ?? NaN)}
            />
            <NumberField
              label="Población femenina"
              value={women}
              onValueChange={(v) => setWomen(v ?? NaN)}
            />
          </div>
          <p>
            Estimación por grupo; I = inodoro, L = lavatorio, U = urinario. No incluye servicios
            independientes de personal, aparatos accesibles ni otros usos. Oficinas: hasta
            6/20/60/150 personas: 1/1/2/3 I y L, luego +1 por 60. Hasta 6: sin U; después U igual a
            I. Comercio/restaurante: hasta 50/100/150: 1/2/3 por aparato, luego +1 por 100. Tablas
            por verificar.
          </p>
        </>
      )}
      {tool === "luz" && (
        <>
          <p>
            Criterio de estudio inicial 10% de iluminación y 5% de ventilación; edita según uso y
            norma aplicable. No verifica patios, orientación ni obstrucciones. No aplica a
            ventilación mecánica.
          </p>
          <div className="field-grid">
            <NumberField
              label="Iluminación requerida"
              unit="% del piso"
              value={light}
              onValueChange={(v) => setLight(v ?? NaN)}
            />
            <NumberField
              label="Ventilación requerida"
              unit="% del piso"
              value={vent}
              onValueChange={(v) => setVent(v ?? NaN)}
            />
            <NumberField
              label="Superficie vidriada útil"
              unit="m²"
              value={glass}
              onValueChange={(v) => setGlass(v ?? NaN)}
            />
            <NumberField
              label="Apertura efectiva al exterior"
              unit="m²"
              value={opening}
              onValueChange={(v) => setOpening(v ?? NaN)}
            />
          </div>
        </>
      )}
      {tool === "parking" && (
        <>
          <NumberField
            label="Total de estacionamientos"
            value={parking}
            onValueChange={(v) => setParking(v ?? NaN)}
          />
          <Link href="/normativa/estacionamiento-accesible">
            Ver ficha de dimensiones y transferencia (por verificar)
          </Link>
        </>
      )}
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <CalculatorResult
          eyebrow="RNE / POR VERIFICAR"
          main={main}
          details={details}
          checks={[]}
          warnings={["Resultado referencial. Revisa la norma vigente y los supuestos indicados."]}
          copyText={`TRAZO · ${titles[tool]} (por verificar): ${main}. ${details}`}
        />
      )}
    </section>
  );
}
