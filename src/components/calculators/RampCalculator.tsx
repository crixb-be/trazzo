"use client";

import { useState } from "react";
import { MoveUpRight } from "lucide-react";
import { Card, NumberField } from "@/components/ui";
import { DiagramFor } from "@/components/svg-diagrams";
import { computeRamp } from "@/lib/calculators/ramps";
import { CalculatorResult } from "./CalculatorResult";

export function RampCalculator() {
  const [rise, setRise] = useState(0.6);
  const [width, setWidth] = useState(1);
  const [proposedSlope, setProposedSlope] = useState<number | null>(null);
  const [availableLength, setAvailableLength] = useState<number | null>(null);
  const result = computeRamp({
    rise,
    width,
    proposedSlope: proposedSlope === null ? undefined : proposedSlope / 100,
    length: availableLength ?? undefined,
  });

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">ENTRADA / A.120</div>
        <h2>Rampa accesible</h2>
        <p className="muted small">
          Ingresa la pendiente propuesta como porcentaje. A.120-2023 art. 6: hasta 0.30 m, 10%;
          hasta 0.72 m, 8%. No se extrapola a desniveles mayores.
        </p>
        <div className="field-grid">
          <NumberField
            label="Desnivel"
            unit="m"
            value={rise}
            min={0}
            onValueChange={(value) => setRise(value ?? 0)}
          />
          <NumberField
            label="Ancho incluidos pasamanos y barandas"
            unit="m"
            value={width}
            min={0}
            onValueChange={(value) => setWidth(value ?? 0)}
          />
          <NumberField
            label="Pendiente propuesta"
            unit="%"
            value={proposedSlope}
            min={0}
            step={0.1}
            onValueChange={setProposedSlope}
          />
          <NumberField
            label="Longitud disponible por tramo (máx. 9 m)"
            unit="m"
            value={availableLength}
            min={0}
            onValueChange={setAvailableLength}
          />
        </div>
        <div className="input-note">
          <MoveUpRight size={15} /> Descansos de 1.50 m cuando se divide el recorrido.
        </div>
      </Card>
      <div className="calculator-visual">
        <DiagramFor type="ramp-slope" params={{ rise, width, slope: result.values.slopeUsed }} />
        <CalculatorResult
          eyebrow="RESULTADO / A.120"
          main={
            result.values.maxSlope
              ? (result.values.maxSlope * 100).toFixed(0) + "% máximo"
              : "Fuera de la tabla"
          }
          details={
            "Longitud requerida " +
            result.values.requiredHorizontalLength.toFixed(2) +
            " m · pendiente usada " +
            (result.values.slopeUsed * 100).toFixed(1) +
            "% · descansos " +
            result.values.landingsNeeded
          }
          checks={result.checks}
          warnings={result.warnings}
          copyText={
            "TRAZZO · Rampa A.120\nDesnivel " +
            rise.toFixed(2) +
            " m · máximo " +
            (result.values.maxSlope * 100).toFixed(0) +
            "% · longitud " +
            result.values.requiredHorizontalLength.toFixed(2) +
            " m"
          }
        />
      </div>
    </div>
  );
}
