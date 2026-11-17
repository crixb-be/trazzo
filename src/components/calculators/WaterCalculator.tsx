"use client";

import { useMemo, useState } from "react";
import { Waves } from "lucide-react";
import { Card, NumberField, Select } from "@/components/ui";
import { residentialDemand, officeDemand, type ClimateCharacter } from "@/lib/calculators/water";
import { CalculatorResult } from "./CalculatorResult";

type WaterMode = "unifamiliar" | "multifamiliar" | "oficinas";

export function WaterCalculator() {
  const [mode, setMode] = useState<WaterMode>("unifamiliar");
  const [climate, setClimate] = useState<ClimateCharacter>("templado");
  const [people, setPeople] = useState(4);
  const [officeArea, setOfficeArea] = useState(100);

  const result = useMemo(() => {
    return mode === "oficinas" ? officeDemand(officeArea) : residentialDemand(climate, people);
  }, [climate, mode, officeArea, people]);

  return (
    <div className="calculator-layout water-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">ENTRADA / IS.010</div>
        <h2>Dotación de agua</h2>
        <Select
          label="Tipo de proyecto"
          value={mode}
          onChange={(event) => setMode(event.target.value as WaterMode)}
          options={[
            { value: "unifamiliar", label: "Vivienda unifamiliar" },
            { value: "multifamiliar", label: "Vivienda multifamiliar" },
            { value: "oficinas", label: "Oficinas" },
          ]}
        />
        {mode !== "oficinas" && (
          <Select
            label="Carácter de clima"
            value={climate}
            onChange={(event) => setClimate(event.target.value as ClimateCharacter)}
            options={[
              { value: "calido", label: "Cálido · 169 L/persona/día" },
              { value: "templado", label: "Templado · 155 L/persona/día" },
              { value: "frio", label: "Frío · 129 L/persona/día" },
            ]}
          />
        )}
        {mode !== "oficinas" && (
          <NumberField
            label="Personas estimadas"
            value={people}
            min={1}
            step={1}
            onValueChange={(value) => setPeople(value ?? 0)}
          />
        )}
        {mode === "oficinas" && (
          <NumberField
            label="Área útil"
            unit="m²"
            value={officeArea}
            min={0}
            onValueChange={(value) => setOfficeArea(value ?? 0)}
          />
        )}
        <div className="input-note">
          <Waves size={15} /> IS.010, RM N° 0107-2025-VIVIENDA: cálido 169, templado 155, frío 129
          L/persona/día.
        </div>
      </Card>
      <div className="calculator-visual">
        <Card className="water-summary">
          <div className="eyebrow">CAPACIDAD DIARIA</div>
          <strong className="result-main mono">
            {result.values.dailyLiters.toLocaleString("es-PE")} L/d
          </strong>
          <div className="water-capacity-grid">
            <div>
              <span className="muted small">Dotación</span>
              <strong className="mono">{result.values.dailyM3.toFixed(2)} m³</strong>
            </div>
            <div>
              <span className="muted small">Cisterna</span>
              <strong className="mono">
                {result.values.cisternLiters.toFixed(0)} L · {result.values.cisternM3.toFixed(2)} m³
              </strong>
            </div>
            <div>
              <span className="muted small">Tanque</span>
              <strong className="mono">
                {result.values.tankLiters.toFixed(0)} L · {result.values.tankM3.toFixed(2)} m³
              </strong>
            </div>
          </div>
        </Card>
        <CalculatorResult
          eyebrow="COMPROBACIONES / IS.010"
          main={result.values.dailyLiters.toLocaleString("es-PE") + " L/d"}
          details={
            "Cisterna " +
            result.values.cisternLiters.toFixed(0) +
            " L · tanque " +
            result.values.tankLiters.toFixed(0) +
            " L"
          }
          checks={result.checks}
          warnings={result.warnings}
          copyText={
            "TRAZZO · Agua IS.010\nDotación " +
            result.values.dailyLiters +
            " L/d\nCisterna " +
            result.values.cisternLiters +
            " L\nTanque " +
            result.values.tankLiters +
            " L"
          }
        />
      </div>
    </div>
  );
}
