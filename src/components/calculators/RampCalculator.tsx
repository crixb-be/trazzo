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
          Ingresa la pendiente propuesta como porcentaje. La tabla usa el desnivel total.
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
            label="Ancho libre"
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
            label="Longitud disponible"
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
          main={(result.values.maxSlope * 100).toFixed(0) + "% máximo"}
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
            "TRAZO · Rampa A.120\nDesnivel " +
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
