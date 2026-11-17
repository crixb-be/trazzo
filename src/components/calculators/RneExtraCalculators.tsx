"use client";
import { useState } from "react";
import { NumberField, Select } from "@/components/ui";
import { OCCUPANCY_USES, computeOccupancy } from "@/lib/calculators/occupancy";
import { fixtureSchedule, type FixtureUse } from "@/lib/calculators/fixtures";
import { accessibleParking } from "@/lib/calculators/accessible-parking";
import { CalculatorResult } from "./CalculatorResult";
export type RneTool = "aforo" | "sanitarios" | "luz" | "parking";
export function RneExtraCalculators({ tool }: { tool: RneTool }) {
  const [area, setArea] = useState(95),
    [use, setUse] = useState<keyof typeof OCCUPANCY_USES>("oficina"),
    [fixtureUse, setFixtureUse] = useState<FixtureUse>("oficina"),
    [people, setPeople] = useState(20),
    [audience, setAudience] = useState<"empleados" | "publico">("empleados"),
    [parking, setParking] = useState(20),
    [opening, setOpening] = useState(5),
    [office, setOffice] = useState(false);
  let main = "",
    details = "",
    error = "";
  try {
    if (tool === "aforo") {
      main = computeOccupancy(area, OCCUPANCY_USES[use].factor) + " personas";
      details = `${OCCUPANCY_USES[use].factor} m²/persona · ${OCCUPANCY_USES[use].ref}. A.130 arts.20–21: calcular por uso y sumar pisos/áreas; mobiliario fijo según plazas.`;
    }
    if (tool === "sanitarios") {
      const r = fixtureSchedule(people, fixtureUse, audience);
      const text = (x: typeof r.men) => `${x.toilets} I, ${x.lavatories} L, ${x.urinals} U`;
      main = r.mixed.toilets ? "Servicio mixto: " + text(r.mixed) : `Hombres: ${text(r.men)}`;
      details = r.mixed.toilets
        ? "Dotación común de población total dentro del rango mixto de la tabla."
        : "Mujeres: " + text(r.women);
      details +=
        " · A.080 art.15 / A.070 art.16.4–16.5. Personal y público se calculan independientemente. No incluye aparatos accesibles; aplicar A.120 a la distribución.";
    }
    if (tool === "parking") {
      main = accessibleParking(parking) + " plazas accesibles";
      details =
        "A.120-2023 art.20: hasta 500, 4% redondeado hacia arriba; desde 501, las 20 plazas base + 1 por cada 100 adicionales o fracción. Art.23: individual 3.70×5.00 m; altura libre 2.10 m.";
    }
    if (tool === "luz") {
      if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(opening) || opening < 0)
        throw new Error("Área positiva y abertura no negativa requeridas.");
      const need = area * (office ? 0.1 : 0.05),
        pass = office ? opening > need : opening >= need;
      main = `${office ? ">" : "≥"} ${need.toFixed(2)} m² de apertura`;
      details = `${pass ? "Alcanza" : "No alcanza"} · ${office ? "A.080 art.5: superior al 10%" : "A.010 art.38.2: no menor al 5%"}. A.010 art.36 no fija un 10% universal de vidrio: iluminación suficiente según uso; no se certifica iluminación con un porcentaje arbitrario.`;
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
      <p>
        Normativa peruana obligatoria · contraste con los PDFs del repositorio, 17/11/2026. Se
        muestra el supuesto aplicable a cada tabla; no extrapolar a otros usos.
      </p>
      {tool === "aforo" && (
        <Select
          label="Uso y ambiente"
          value={use}
          onChange={(e) => setUse(e.target.value as typeof use)}
          options={Object.entries(OCCUPANCY_USES).map(([value, v]) => ({ value, label: v.label }))}
        />
      )}
      {(tool === "aforo" || tool === "luz") && (
        <NumberField
          label="Área útil del ambiente"
          unit="m²"
          value={area}
          onValueChange={(v) => setArea(v ?? 0)}
        />
      )}
      {tool === "sanitarios" && (
        <>
          <Select
            label="Uso sanitario"
            value={fixtureUse}
            onChange={(e) => setFixtureUse(e.target.value as FixtureUse)}
            options={[
              { value: "oficina", label: "Oficina · empleados" },
              { value: "comercio", label: "Tienda independiente (A.070 16.4)" },
              { value: "restaurante", label: "Restaurante o cafetería (A.070 16.5)" },
            ]}
          />
          {fixtureUse !== "oficina" && (
            <Select
              label="Población servida"
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              options={[
                { value: "empleados", label: "Empleados" },
                { value: "publico", label: "Público (independiente de empleados)" },
              ]}
            />
          )}
          <NumberField
            label="Población TOTAL de la tabla"
            value={people}
            onValueChange={(v) => setPeople(v ?? 0)}
          />
          <p>
            I: inodoro · L: lavatorio · U: urinario. Se retiró el método incorrecto que aplicaba la
            tabla a cada sexo por separado. Para otros establecimientos comerciales usa su tabla
            específica (art.16.6 y siguientes).
          </p>
        </>
      )}
      {tool === "luz" && (
        <>
          <label>
            <input type="checkbox" checked={office} onChange={(e) => setOffice(e.target.checked)} />{" "}
            Oficina con ventilación natural
          </label>
          <NumberField
            label="Área efectiva del vano que abre al exterior"
            unit="m²"
            value={opening}
            onValueChange={(v) => setOpening(v ?? 0)}
          />
        </>
      )}
      {tool === "parking" && (
        <NumberField
          label="Total de estacionamientos de uso público"
          value={parking}
          onValueChange={(v) => setParking(v ?? 0)}
        />
      )}{" "}
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <CalculatorResult
          eyebrow="RNE · CONTRASTADO CON PDF"
          main={main}
          details={details}
          checks={[]}
          warnings={[
            "Comprueba alcance por uso, condiciones y modificaciones posteriores al documento aportado.",
          ]}
          copyText={`${titles[tool]}: ${main}. ${details}`}
        />
      )}
    </section>
  );
}
