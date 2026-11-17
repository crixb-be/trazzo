"use client";

import { useState } from "react";
import { DoorOpen } from "lucide-react";
import { Card, NumberField, Select } from "@/components/ui";
import { DiagramFor } from "@/components/svg-diagrams";
import { computeStair } from "@/lib/calculators/stairs";
import { CalculatorResult } from "./CalculatorResult";

export function StairCalculator() {
  const [activity, setActivity] = useState<
    | "vivienda"
    | "industria"
    | "oficinas"
    | "hospedaje"
    | "comercio"
    | "servicios"
    | "salud"
    | "educacion"
    | "transporte"
    | "recreacion"
  >("vivienda");
  const [floorHeight, setFloorHeight] = useState(2.7);
  const [width, setWidth] = useState(0.9);
  const [preferredTread, setPreferredTread] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<"height" | "width" | "tread" | null>(null);
  const [use, setUse] = useState<"vivienda" | "evacuacion">("vivienda");
  const result = computeStair({
    floorHeight,
    activity,
    width,
    preferredTread: preferredTread ?? undefined,
    use,
  });

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">ENTRADA / A.010</div>
        <h2>Escalera cómoda y verificable</h2>
        <p className="muted small">
          Unidades en metros. El tramo se divide automáticamente cuando supera 17 pasos.
        </p>
        <div className="field-grid">
          <Select
            label="Actividad para huella mínima"
            value={activity}
            onChange={(e) => setActivity(e.target.value as typeof activity)}
            options={[
              "vivienda",
              "industria",
              "oficinas",
              "hospedaje",
              "comercio",
              "servicios",
              "salud",
              "educacion",
              "transporte",
              "recreacion",
            ].map((value) => ({ value, label: value }))}
          />
          <NumberField
            label="Altura piso a piso"
            unit="m"
            value={floorHeight}
            min={0}
            onFocus={() => setActiveField("height")}
            onBlur={() => setActiveField(null)}
            onValueChange={(value) => setFloorHeight(value ?? 0)}
          />
          <NumberField
            label="Ancho libre"
            unit="m"
            value={width}
            min={0}
            onFocus={() => setActiveField("width")}
            onBlur={() => setActiveField(null)}
            onValueChange={(value) => setWidth(value ?? 0)}
          />
          <NumberField
            label="Paso / Huella (p)"
            unit="m"
            hint="Profundidad donde pisa el pie; mínimo por uso A.010 art.23.2.b"
            value={preferredTread}
            min={0}
            onFocus={() => setActiveField("tread")}
            onBlur={() => setActiveField(null)}
            onValueChange={setPreferredTread}
          />
          <Select
            label="Uso"
            value={use}
            onChange={(event) => setUse(event.target.value as "vivienda" | "evacuacion")}
            options={[
              { value: "vivienda", label: "Vivienda · 0.90 m" },
              { value: "evacuacion", label: "Evacuación · 1.20 m" },
            ]}
          />
        </div>
        <div className="input-note">
          <DoorOpen size={15} /> El paso sugerido usa Blondel como criterio de diseño; no es una
          exigencia de A.010.
        </div>
      </Card>
      <div className="calculator-visual">
        <DiagramFor
          type="stair-step"
          params={{
            risers: result.values.risers,
            cp: result.values.riserHeight,
            p: result.values.tread,
            highlight: activeField ?? "",
            width,
          }}
        />
        <CalculatorResult
          eyebrow="RESULTADO / A.010"
          main={result.values.risers + " contrapasos"}
          details={
            "cp " +
            result.values.riserHeight.toFixed(3) +
            " m · paso " +
            result.values.tread.toFixed(3) +
            " m · 2cp+p " +
            result.values.blondel.toFixed(3) +
            " m · " +
            result.values.flights +
            " tramo(s)"
          }
          checks={result.checks}
          warnings={result.warnings}
          copyText={
            "TRAZZO · Escalera A.010\n" +
            result.values.risers +
            " contrapasos · cp " +
            result.values.riserHeight.toFixed(3) +
            " m · paso " +
            result.values.tread.toFixed(3) +
            " m"
          }
        />
      </div>
    </div>
  );
}
