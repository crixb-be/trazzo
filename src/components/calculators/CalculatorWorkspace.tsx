"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useSearchParams } from "next/navigation";
import { EvacuationCalculator } from "./EvacuationCalculator";
import { LightWellCalculator } from "./LightWellCalculator";
import { RampCalculator } from "./RampCalculator";
import { StairCalculator } from "./StairCalculator";
import { A090_LEGAL_NOTE } from "@/data/norms/a090";
import { NTS113_LEGAL_NOTE } from "@/data/norms/nts113";
import { RNE_WARNING } from "@/lib/calculators/types";
import { HealthNts113Calculator } from "./HealthNts113Calculator";
import { CommunalA090Calculator } from "./CommunalA090Calculator";
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
  | "evacuacion"
  | "salud-nts113"
  | "comunales-a090";

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
  { id: "salud-nts113", label: "Salud · NTS 113" },
  { id: "comunales-a090", label: "Servicios Comunales · A.090" },
  ...FIELD_EXTRA_TOOLS,
];

function normalizeTab(value: string | null): CalculatorTab {
  return tabs.some((tab) => tab.id === value) ? (value as CalculatorTab) : "escaleras";
}

export function CalculatorWorkspace() {
  const searchParams = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const navigation = useRef<HTMLElement>(null);
  const activePill = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const nav = navigation.current;
    const pill = activePill.current;
    if (!nav || !pill || !window.matchMedia("(max-width: 699px)").matches) return;
    const container = nav.getBoundingClientRect();
    const current = pill.getBoundingClientRect();
    nav.scrollLeft += current.left - container.left - (container.width - current.width) / 2;
  }, [activeTab]);

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
      </div>
      <div className="calculator-navigation">
        <nav className="segmented calculator-pills" aria-label="Calculadoras" ref={navigation}>
          {tabs.map((tab) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tab.id);
            const active = activeTab === tab.id;
            return (
              <Link
                href={"/calculadoras?" + params.toString()}
                key={tab.id}
                ref={active ? activePill : undefined}
                scroll={false}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="calculator-disclaimer">
        {activeTab === "salud-nts113"
          ? NTS113_LEGAL_NOTE
          : activeTab === "comunales-a090"
            ? A090_LEGAL_NOTE
            : RNE_WARNING}
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
      {activeTab === "salud-nts113" && <HealthNts113Calculator />}
      {activeTab === "comunales-a090" && <CommunalA090Calculator />}
    </div>
  );
}
