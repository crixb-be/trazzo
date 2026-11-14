"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Waves } from "lucide-react";
import { Button, Card, NumberField, Select } from "@/components/ui";
import {
  multiFamilyDemand,
  officeDemand,
  singleFamilyDemand,
  type ApartmentDemand,
} from "@/lib/calculators/water";
import { CalculatorResult } from "./CalculatorResult";

type WaterMode = "unifamiliar" | "multifamiliar" | "oficinas";

export function WaterCalculator() {
  const [mode, setMode] = useState<WaterMode>("unifamiliar");
  const [area, setArea] = useState(200);
  const [units, setUnits] = useState<ApartmentDemand[]>([{ bedrooms: 2, count: 1 }]);
  const [officeArea, setOfficeArea] = useState(100);

  const result = useMemo(() => {
    if (mode === "unifamiliar") return singleFamilyDemand(area);
    if (mode === "oficinas") return officeDemand(officeArea);
    return multiFamilyDemand(units);
  }, [area, mode, officeArea, units]);

  function addUnit(): void {
    setUnits((current) => [...current, { bedrooms: 1, count: 1 }]);
  }

  function updateUnit(index: number, next: ApartmentDemand): void {
    setUnits((current) => current.map((unit, unitIndex) => (unitIndex === index ? next : unit)));
  }

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
        {mode === "unifamiliar" && (
          <NumberField
            label="Área de lote"
            unit="m²"
            value={area}
            min={0}
            onChange={(e) => setArea(Number(e.target.value))}
          />
        )}
        {mode === "oficinas" && (
          <NumberField
            label="Área útil"
            unit="m²"
            value={officeArea}
            min={0}
            onChange={(e) => setOfficeArea(Number(e.target.value))}
          />
        )}
        {mode === "multifamiliar" && (
          <div className="unit-rows">
            {units.map((unit, index) => (
              <div className="unit-row" key={index}>
                <NumberField
                  label="Dormitorios"
                  value={unit.bedrooms}
                  min={1}
                  max={5}
                  step={1}
                  onChange={(e) => updateUnit(index, { ...unit, bedrooms: Number(e.target.value) })}
                />
                <NumberField
                  label="Cantidad"
                  unit="dptos."
                  value={unit.count}
                  min={1}
                  step={1}
                  onChange={(e) => updateUnit(index, { ...unit, count: Number(e.target.value) })}
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setUnits((current) => current.filter((_, row) => row !== index))}
                  aria-label="Eliminar tipo de departamento"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addUnit}>
              <Plus size={14} /> Agregar tipo
            </Button>
          </div>
        )}
        <div className="input-note">
          <Waves size={15} /> Cisterna = 3/4 de la dotación. Tanque = max(1/3, 1,000 L).
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
