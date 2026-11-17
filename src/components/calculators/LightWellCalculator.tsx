"use client";

import { useState } from "react";
import { Card, NumberField, Select } from "@/components/ui";
import { DiagramFor } from "@/components/svg-diagrams";
import { computeLightWell } from "@/lib/calculators/lightwell";
import { CalculatorResult } from "./CalculatorResult";

export function LightWellCalculator() {
  const [wallHeight, setWallHeight] = useState(6);
  const [kind, setKind] = useState<"habitable" | "servicios">("habitable");
  const [proposedSide, setProposedSide] = useState<number | null>(null);
  const [sides, setSides] = useState<1 | 2 | 3 | 4>(2);
  const [building, setBuilding] = useState<"bifamiliar" | "multifamiliar">("multifamiliar");
  const result = computeLightWell({
    wallHeight,
    sides,
    building,
    kind,
    proposedSide: proposedSide ?? undefined,
  });

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">ENTRADA / A.020-2021</div>
        <h2>Pozo de luz</h2>
        <p className="muted small">H es la altura del paramento más bajo que limita el pozo.</p>
        <div className="field-grid">
          <Select
            label="Tipo de vivienda"
            value={building}
            onChange={(e) => setBuilding(e.target.value as typeof building)}
            options={[
              { value: "bifamiliar", label: "Bifamiliar" },
              { value: "multifamiliar", label: "Multifamiliar" },
            ]}
          />
          <Select
            label="Lados con edificación propia"
            value={String(sides)}
            onChange={(e) => setSides(+e.target.value as typeof sides)}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
          />
          <NumberField
            label="Altura del paramento H"
            unit="m"
            value={wallHeight}
            min={0}
            onValueChange={(value) => setWallHeight(value ?? 0)}
          />
          <Select
            label="Tipo de ambiente"
            value={kind}
            onChange={(event) => setKind(event.target.value as "habitable" | "servicios")}
            options={[
              { value: "habitable", label: "Dormitorio, sala o comedor" },
              { value: "servicios", label: "Cocina o patio techado" },
            ]}
          />
          <NumberField
            label="Lado propuesto"
            unit="m"
            value={proposedSide}
            min={0}
            onValueChange={setProposedSide}
          />
        </div>
      </Card>
      <div className="calculator-visual">
        <DiagramFor type="light-well" params={{ height: wallHeight, kind, sides, building }} />
        <CalculatorResult
          eyebrow="RESULTADO / A.020-2021"
          main={result.values.minSide.toFixed(2) + " m"}
          details="A.020 art. 11.3.b, cuadro 4: suma por tramos de 18 m y mínimo según tipología."
          checks={result.checks}
          warnings={result.warnings}
          copyText={
            "TRAZZO · Pozo de luz A.020\nLado mínimo " +
            result.values.minSide.toFixed(2) +
            " m · art. 11.3.b, cuadro 4"
          }
        />
      </div>
    </div>
  );
}
