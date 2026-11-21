"use client";

import { useState } from "react";
import { Card, NumberField, Select } from "@/components/ui";
import {
  A090_CODE,
  A090_LEGAL_NOTE,
  A090_OCCUPANCY,
  type A090OccupancyUse,
} from "@/data/norms/a090";
import {
  a090EmployeeFixtures,
  a090Occupancy,
  a090PublicFixtures,
  formatFixtures,
  type A090Fixtures,
} from "@/lib/calculators/a090";
import type { CalcCheck } from "@/lib/calculators/types";
import { CalculatorResult } from "./CalculatorResult";

const notes = [
  "Distancia máxima a los servicios higiénicos: 30 m en horizontal y no más de un piso (Art. 14).",
  "Más allá del último tramo, cada 100 personas iniciadas suman un juego de aparatos (criterio conservador: el texto dice “por cada 100 adicionales” sin precisar fracción).",
];

function fixturesText(fixtures: A090Fixtures): string {
  const men = formatFixtures(fixtures.men);
  if (fixtures.shared) return `${men} (un solo grupo, tabla de 1 a 6 empleados)`;
  return `Hombres: ${men} · Mujeres: ${formatFixtures(fixtures.women, false)}`;
}

function information(label: string, value: string, article: string): CalcCheck {
  return {
    label,
    value,
    limit: "",
    pass: true,
    informational: true,
    ref: `${A090_CODE} · ${article}`,
  };
}

function countError(count: number | null): string | undefined {
  return count !== null && !Number.isInteger(count) ? "Ingresa un número entero." : undefined;
}

export function CommunalA090Calculator() {
  const [use, setUse] = useState<A090OccupancyUse>(A090_OCCUPANCY[0].id);
  const [area, setArea] = useState<number | null>(null);
  const [employees, setEmployees] = useState<number | null>(0);
  const [publicCount, setPublicCount] = useState<number | null>(0);
  const [useOccupancy, setUseOccupancy] = useState(true);

  const occupancy = area === null ? null : a090Occupancy(use, area);
  const people = useOccupancy ? occupancy : publicCount;
  const employeeError = countError(employees);
  const publicError = countError(publicCount);
  const employeeFixtures =
    employees !== null && !employeeError ? a090EmployeeFixtures(employees) : null;
  const publicFixtures =
    people !== null && Number.isInteger(people) ? a090PublicFixtures(people) : null;
  const factor = A090_OCCUPANCY.find((row) => row.id === use)?.factor;
  const employeeText = employeeFixtures ? fixturesText(employeeFixtures) : "Pendiente";
  const publicText = publicFixtures ? fixturesText(publicFixtures) : "Pendiente";
  const accessibleText =
    employeeFixtures && publicFixtures
      ? String(employeeFixtures.accessible + publicFixtures.accessible)
      : "Pendiente";
  const main = `${occupancy} personas`;
  const details = `Empleados: ${employeeText}. Público: ${publicText}. Aparatos accesibles: ${accessibleText}.`;
  const checks = [
    information("Aforo", `${area} m² · ${factor} m² por persona`, "Art. 11"),
    information("Dotación para empleados", employeeText, "Art. 15"),
    information("Dotación para público", publicText, "Art. 15"),
    information("Aparatos accesibles", accessibleText, "Art. 16"),
  ];

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">Entrada / {A090_CODE}</div>
        <h2>Aforo y dotación de servicios higiénicos</h2>
        <div className="field-grid">
          <Select
            label="Sub-uso"
            value={use}
            onChange={(event) => setUse(event.target.value as A090OccupancyUse)}
            options={A090_OCCUPANCY.map(({ id, label }) => ({ value: id, label }))}
          />
          <NumberField label="Área" value={area} min={0} unit="m²" onValueChange={setArea} />
          <NumberField
            label="Empleados"
            value={employees}
            min={0}
            error={employeeError}
            onValueChange={setEmployees}
          />
          <NumberField
            label="Público"
            value={Number.isFinite(people) ? people : null}
            min={0}
            disabled={useOccupancy}
            error={useOccupancy ? undefined : publicError}
            onValueChange={setPublicCount}
          />
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useOccupancy}
            onChange={(event) => setUseOccupancy(event.target.checked)}
          />
          Usar el aforo calculado como público
        </label>
      </Card>
      <div className="calculator-visual">
        {occupancy !== null && Number.isFinite(occupancy) ? (
          <CalculatorResult
            eyebrow={`RESULTADO / ${A090_CODE}`}
            main={main}
            details={details}
            checks={checks}
            warnings={notes}
            disclaimer={A090_LEGAL_NOTE}
            copyText={[main, details, ...notes].join("\n")}
          />
        ) : (
          <Card className="calculator-result">
            <p className="muted">
              {occupancy === null
                ? "Ingresa el área para calcular el aforo."
                : "Ingresa un área menor."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
