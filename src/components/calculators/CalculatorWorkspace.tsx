"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { EvacuationCalculator } from "./EvacuationCalculator";
import { LightWellCalculator } from "./LightWellCalculator";
import { RampCalculator } from "./RampCalculator";
import { StairCalculator } from "./StairCalculator";
import { WaterCalculator } from "./WaterCalculator";

import { MaterialsCalculator } from "./materials/MaterialsCalculator";

import { FieldTools } from "./tools/FieldTools";

import { CabidaCalculator } from "./CabidaCalculator";

import { RneExtraCalculators, type RneTool } from "./RneExtraCalculators";

import { FIELD_EXTRA_TOOLS, type FieldExtraTool } from "@/lib/calculators/field-extra";
import { FieldExtraCalculators } from "./tools/FieldExtraCalculators";

type CalculatorTab =
  | FieldExtraTool
  | RneTool
  | "cabida"
  | "utilidades"
  | "materiales"
  | "escaleras"
  | "rampas"
  | "agua"
  | "pozos"
  | "evacuacion";

const tabs: Array<{ id: CalculatorTab; label: string }> = [
  { id: "aforo", label: "Aforo" },
  { id: "sanitarios", label: "Aparatos sanitarios" },
  { id: "luz", label: "Luz y ventilación" },
  { id: "parking", label: "Plazas accesibles" },
  { id: "cabida", label: "Cabida de terreno" },
  { id: "utilidades", label: "Utilidades de campo" },
  { id: "materiales", label: "Materiales" },
  { id: "escaleras", label: "Escaleras" },
  { id: "rampas", label: "Rampas" },
  { id: "agua", label: "Dotación de agua" },
  { id: "pozos", label: "Pozos de luz" },
  { id: "evacuacion", label: "Evacuación" },
  ...FIELD_EXTRA_TOOLS,
];

function normalizeTab(value: string | null): CalculatorTab {
  return tabs.some((tab) => tab.id === value) ? (value as CalculatorTab) : "escaleras";
}

export function CalculatorWorkspace() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CalculatorTab>(normalizeTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  function selectTab(tab: CalculatorTab): void {
    setActiveTab(tab);
    window.history.replaceState(null, "", "/calculadoras?tab=" + tab);
  }

  const fieldExtraTool = FIELD_EXTRA_TOOLS.find(({ id }) => id === activeTab);

  return (
    <div className="calculators-page">
      <div className="eyebrow">Herramientas / RNE</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Cotas para decidir</h1>
          <p className="lead">
            Resultados referenciales para anteproyecto, revisión y coordinación de obra.
          </p>
        </div>
        <span className="mono small muted">{tabs.length} módulos</span>
      </div>
      <label className="calculator-selector" htmlFor="calculator-select">
        Calculadora
        <select
          id="calculator-select"
          className="input"
          value={activeTab}
          onChange={(event) => selectTab(event.target.value as CalculatorTab)}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </label>
      <div className="calculator-tabs" role="tablist" aria-label="Calculadoras">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => selectTab(tab.id)}
            key={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="calculator-disclaimer">
        Valores referenciales según la edición indicada del RNE. Verifica la versión vigente
        publicada por el MVCS antes de usar en expedientes.
      </div>
      {(["aforo", "sanitarios", "luz", "parking"] as string[]).includes(activeTab) && (
        <RneExtraCalculators key={activeTab} tool={activeTab as RneTool} />
      )}
      {fieldExtraTool && <FieldExtraCalculators tool={fieldExtraTool.id} />}
      {activeTab === "cabida" && <CabidaCalculator />}
      {activeTab === "utilidades" && <FieldTools />}
      {activeTab === "materiales" && <MaterialsCalculator />}
      {activeTab === "escaleras" && <StairCalculator />}
      {activeTab === "rampas" && <RampCalculator />}
      {activeTab === "agua" && <WaterCalculator />}
      {activeTab === "pozos" && <LightWellCalculator />}
      {activeTab === "evacuacion" && <EvacuationCalculator />}
    </div>
  );
}
