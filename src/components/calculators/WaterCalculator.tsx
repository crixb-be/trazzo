"use client";
import { useState } from "react";
import { NumberField, Select } from "@/components/ui";
import {
  multiFamilyDemand,
  residentialDemand,
  officeDemand,
  type Climate,
} from "@/lib/calculators/water";
import { CalculatorResult } from "./CalculatorResult";
export function WaterCalculator() {
  const [mode, setMode] = useState("multifamiliar"),
    [bedrooms, setBedrooms] = useState(2),
    [count, setCount] = useState(1),
    [people, setPeople] = useState(3),
    [climate, setClimate] = useState<Climate>("templado");
  const r =
    mode === "oficina"
      ? officeDemand(people)
      : mode === "poblacion"
        ? residentialDemand(people, climate)
        : multiFamilyDemand([{ bedrooms, count }], climate);
  return (
    <section>
      <h2>Dotación por uso</h2>
      <p>
        Normativa peruana obligatoria · RM 0107-2025-VIVIENDA, IS.010 2.2.a; A.020 art. 7. Se
        retiraron las tablas derogadas por área de lote y por departamento. Selecciona clima con el
        mapa de SENAMHI. Para oficinas se aplica la tabla aportada de A.080 art.17 (20
        L/persona/día), no la dotación residencial por clima.
      </p>
      <Select
        label="Método de población"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        options={[
          { value: "multifamiliar", label: "Viviendas por dormitorios" },
          { value: "oficina", label: "Oficinas · A.080 art.17 (20 L/persona/día)" },
          { value: "poblacion", label: "Población sustentada del proyecto" },
        ]}
      />
      {mode !== "oficina" && (
        <Select
          label="Carácter del clima"
          value={climate}
          onChange={(e) => setClimate(e.target.value as Climate)}
          options={[
            { value: "calido", label: "Cálido · 169 L/persona/día" },
            { value: "templado", label: "Templado · 155 L/persona/día" },
            { value: "frio", label: "Frío, semifrígido, frígido o glaciar · 129 L/persona/día" },
          ]}
        />
      )}
      {mode === "poblacion" || mode === "oficina" ? (
        <NumberField
          label={mode === "oficina" ? "Empleados de oficina" : "Habitantes sustentados"}
          value={people}
          onValueChange={(v) => setPeople(v ?? 0)}
        />
      ) : (
        <>
          <NumberField
            label="Dormitorios por vivienda"
            value={bedrooms}
            onValueChange={(v) => setBedrooms(v ?? 0)}
          />
          <NumberField
            label="Número de viviendas iguales"
            value={count}
            onValueChange={(v) => setCount(v ?? 0)}
          />
          <p>
            A.020: 1/2/3 dormitorios → 2/3/4 personas; más de 3, incremento de una persona por
            dormitorio solo para multifamiliar. Para vivienda colectiva corresponde una persona por
            dormitorio; usa población sustentada.
          </p>
        </>
      )}
      <CalculatorResult
        eyebrow={mode === "oficina" ? "A.080 · art.17" : "IS.010 · 2.2.a · 2025"}
        main={r.ok ? r.values.dailyLiters + " L/d" : "Entrada no válida"}
        details={r.values.people + " personas · " + r.values.dailyM3.toFixed(3) + " m³/d"}
        checks={r.checks}
        warnings={r.warnings}
        copyText={
          mode === "oficina"
            ? `Oficinas: ${r.values.dailyLiters} L/d · A.080 art.17`
            : `Dotación residencial: ${r.values.dailyLiters} L/d · ${climate} · RM 0107-2025-VIVIENDA`
        }
      />
    </section>
  );
}
