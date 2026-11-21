"use client";

import { useState } from "react";
import { Card, NumberField, Select } from "@/components/ui";
import {
  HEALTH_CATEGORIES,
  NTS113_AREAS,
  NTS113_CODE,
  NTS113_CORRIDORS,
  NTS113_DOORS,
  NTS113_LEGAL_NOTE,
  type HealthCategory,
} from "@/data/norms/nts113";
import {
  checkHealthArea,
  checkHealthCorridor,
  checkHealthDoor,
  checkHealthHeight,
  checkHealthStair,
  type HealthCheckKind,
  type I4Project,
} from "@/lib/calculators/nts113";
import { CalculatorResult } from "./CalculatorResult";

const checkOptions = [
  { value: "area", label: "Área de ambiente" },
  { value: "corredor", label: "Ancho de corredor" },
  { value: "puerta", label: "Ancho de puerta" },
  { value: "altura", label: "Altura libre" },
  { value: "escalera", label: "Escalera integrada" },
];
const areaGroups = [...new Set(NTS113_AREAS.map(({ group }) => group))];
const availabilityNote =
  "La disponibilidad de cada ambiente depende de la cartera de servicios del establecimiento.";

export function HealthNts113Calculator() {
  const [category, setCategory] = useState<HealthCategory>(HEALTH_CATEGORIES[0]);
  const [kind, setKind] = useState<HealthCheckKind>("area");
  const [area, setArea] = useState(NTS113_AREAS[0].code);
  const [corridor, setCorridor] = useState<string>(NTS113_CORRIDORS[0].id);
  const [door, setDoor] = useState<string>(NTS113_DOORS[0].id);
  const [project, setProject] = useState<I4Project>("nuevo");
  const [xRayOrDelivery, setXRayOrDelivery] = useState(false);
  const [projected, setProjected] = useState<number | null>(null);

  const check = {
    area: (value: number) => checkHealthArea(area, category, value),
    corredor: (value: number) => checkHealthCorridor(corridor, value),
    puerta: (value: number) => checkHealthDoor(door, value),
    altura: (value: number) =>
      checkHealthHeight(category, value, project, project === "existente" && xRayOrDelivery),
    escalera: (value: number) => checkHealthStair(category, value),
  }[kind];
  const result = projected === null ? null : check(projected);
  const status = result?.applies
    ? result.pass
      ? "Cumple"
      : "No cumple"
    : `No aplica a ${category}`;
  const details = result ? [result.ref, ...result.notes].join(" · ") : "";
  const main = result ? `${status} · mínimo ${result.minimum.toFixed(2)} ${result.unit}` : "";

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">Entrada / {NTS113_CODE}</div>
        <h2>Verificación de condiciones en salud</h2>
        <div className="field-grid">
          <Select
            label="Categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value as HealthCategory)}
            options={HEALTH_CATEGORIES.map((value) => ({ value, label: value }))}
          />
          <Select
            label="Qué verificar"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as HealthCheckKind);
              setProjected(null);
            }}
            options={checkOptions}
          />
          {kind === "area" && (
            <div className="field">
              <label htmlFor="nts113-area">Ambiente</label>
              <select
                id="nts113-area"
                className="select"
                value={area}
                onChange={(event) => setArea(event.target.value)}
              >
                {areaGroups.map((group) => (
                  <optgroup key={group} label={group}>
                    {NTS113_AREAS.filter((item) => item.group === group).map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          {kind === "corredor" && (
            <Select
              label="Corredor"
              value={corridor}
              onChange={(event) => setCorridor(event.target.value)}
              options={NTS113_CORRIDORS.map(({ id, name }) => ({ value: id, label: name }))}
            />
          )}
          {kind === "puerta" && (
            <Select
              label="Puerta"
              value={door}
              onChange={(event) => setDoor(event.target.value)}
              options={NTS113_DOORS.map(({ id, name }) => ({ value: id, label: name }))}
            />
          )}
          {kind === "altura" && category === "I-4" && (
            <>
              <Select
                label="Tipo de establecimiento"
                value={project}
                onChange={(event) => setProject(event.target.value as I4Project)}
                options={[
                  { value: "nuevo", label: "Nuevo" },
                  { value: "existente", label: "Existente" },
                ]}
              />
              {project === "existente" && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={xRayOrDelivery}
                    onChange={(event) => setXRayOrDelivery(event.target.checked)}
                  />
                  Sala de Rayos X o Sala de Partos
                </label>
              )}
            </>
          )}
          <NumberField
            label="Valor proyectado"
            unit={kind === "area" ? "m²" : "m"}
            value={projected}
            min={0}
            onValueChange={setProjected}
          />
        </div>
        {!result && <p className="input-note">{availabilityNote}</p>}
      </Card>
      <div className="calculator-visual">
        {result ? (
          <CalculatorResult
            eyebrow={`RESULTADO / ${NTS113_CODE}`}
            main={main}
            details={details}
            checks={[result.applies ? result.check : { ...result.check, informational: true }]}
            warnings={[availabilityNote]}
            disclaimer={NTS113_LEGAL_NOTE}
            copyText={[main, result.label, details, availabilityNote].join("\n")}
          />
        ) : (
          <Card className="calculator-result">
            <p className="muted">Ingresa el valor proyectado para verificarlo.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
