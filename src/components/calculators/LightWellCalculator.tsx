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
  const result = computeLightWell({
    wallHeight,
    kind,
    proposedSide: proposedSide ?? undefined,
  });

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">ENTRADA / A.010</div>
        <h2>Pozo de luz</h2>
        <p className="muted small">H es la altura del paramento más bajo que limita el pozo.</p>
        <div className="field-grid">
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
              { value: "habitable", label: "Habitable · H/3" },
              { value: "servicios", label: "Servicios · H/4" },
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
        <DiagramFor type="light-well" params={{ height: wallHeight, kind }} />
        <CalculatorResult
          eyebrow="RESULTADO / A.010"
          main={result.values.minSide.toFixed(2) + " m"}
          details={
            "Lado mínimo = max(" +
            result.values.baseSide.toFixed(2) +
            " m, H/" +
            result.values.ratio +
            ")"
          }
          checks={result.checks}
          warnings={result.warnings}
          copyText={
            "TRAZO · Pozo de luz A.010\nLado mínimo " +
            result.values.minSide.toFixed(2) +
            " m\nRegla H/" +
            result.values.ratio
          }
        />
      </div>
    </div>
  );
}
