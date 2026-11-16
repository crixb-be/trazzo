"use client";
import { useState } from "react";
import { NumberField } from "@/components/ui";
import { computeCabida, type CabidaInput } from "@/lib/calculators/cabida";
import { CalculatorResult } from "./CalculatorResult";
const labels: Record<keyof CabidaInput, [string, string]> = {
  lotArea: ["Área del lote", "m²"],
  frontage: ["Frente del lote rectangular", "m"],
  coefficient: ["Coeficiente de edificación", ""],
  freePct: ["Área libre", "%"],
  maxHeight: ["Altura máxima", "m"],
  floorHeight: ["Altura piso a piso", "m"],
  frontSetback: ["Retiro frontal", "m"],
  rearSetback: ["Retiro posterior", "m"],
  leftSetback: ["Retiro izquierdo", "m"],
  rightSetback: ["Retiro derecho", "m"],
  salePct: ["Proporción vendible estimada", "%"],
};
export function CabidaCalculator() {
  const [p, setP] = useState<CabidaInput>({
    lotArea: 200,
    frontage: 10,
    coefficient: 3,
    freePct: 30,
    maxHeight: 12,
    floorHeight: 3,
    frontSetback: 3,
    rearSetback: 0,
    leftSetback: 0,
    rightSetback: 0,
    salePct: 80,
  });
  let r: ReturnType<typeof computeCabida> | undefined;
  let error = "";
  try {
    r = computeCabida(p);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <section>
      <h2>Cabida de terreno</h2>
      <p>
        Modelo para lote rectangular, plantas repetidas y retiros constantes. Usa los parámetros
        municipales del predio. No descuenta patios adicionales, estacionamientos, servidumbres ni
        exigencias por uso.
      </p>
      <div className="field-grid">
        {(Object.keys(labels) as (keyof CabidaInput)[]).map((k) => (
          <NumberField
            key={k}
            label={labels[k][0]}
            unit={labels[k][1]}
            value={p[k]}
            onValueChange={(v) => setP({ ...p, [k]: v ?? NaN })}
          />
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {r && (
        <CalculatorResult
          eyebrow="CABIDA / ESTIMACIÓN"
          main={r.gross.toFixed(2) + " m² techados"}
          details={`Huella ${r.footprint.toFixed(2)} m² · ${r.floors} pisos permitidos por altura · ${r.fullFloors} plantas completas + ${r.partialArea.toFixed(2)} m² · vendible ${r.saleable.toFixed(2)} m²`}
          checks={[]}
          warnings={[
            "Estimación geométrica; verifica certificado de parámetros, norma de uso y factibilidad del proyecto.",
          ]}
          copyText={`TRAZZO · Cabida: ${r.gross.toFixed(2)} m² techados; ${r.saleable.toFixed(2)} m² vendibles estimados.`}
        />
      )}
    </section>
  );
}
