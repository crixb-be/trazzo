"use client";

import { useState } from "react";
import { Card, NumberField } from "@/components/ui";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { CopyResultButton } from "../CalculatorResult";
import {
  convertScale,
  FIELD_EXTRA_TOOLS,
  imperialToMetric,
  lotCoverage,
  metricToImperial,
  OCCUPANCY_NOTE,
  roofPitch,
  SCALE_PRESETS,
  type FieldExtraTool,
  type ScaleDirection,
} from "@/lib/calculators/field-extra";
import { fieldToolResultSheet } from "@/lib/share/workspace-sheets";

const format = (value: number, digits = 4) =>
  value.toLocaleString("es-PE", { maximumFractionDigits: digits });
type ResultRow = { label: string; value: string };

function FieldExtraCard({
  tool,
  children,
  calculate,
  note,
}: {
  tool: FieldExtraTool;
  children: React.ReactNode;
  calculate: () => { rows: ResultRow[]; warning?: string | null };
  note?: string;
}) {
  const title = FIELD_EXTRA_TOOLS.find(({ id }) => id === tool)!.label;
  let result: ReturnType<typeof calculate> | undefined;
  let error = "";
  try {
    result = calculate();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Revisa los datos ingresados.";
  }
  const notes = [result?.warning, note].filter((text): text is string => !!text);
  const sheet = result
    ? fieldToolResultSheet({
        toolLabel: title,
        result: result.rows[0].value,
        rows: result.rows,
        notes,
      })
    : null;
  const copyText = result?.rows.map(({ label, value }) => label + ": " + value).join("\n") ?? "";
  return (
    <Card className="field-extra-card">
      <h2>{title}</h2>
      {children}
      <div role="status">
        {error && <p className="warning">{error}</p>}
        {result && (
          <dl className="site-log-metrics">
            {result.rows.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {result?.warning && <p className="warning">{result.warning}</p>}
      </div>
      {note && <p className="muted small">{note}</p>}
      {sheet && (
        <div className="calculator-result-actions" role="group" aria-label="Acciones del resultado">
          <CopyResultButton text={copyText} />
          <SaveToProject sheet={sheet} />
          <ShareResult sheet={sheet} />
        </div>
      )}
    </Card>
  );
}

function ScaleCalculator() {
  const [preset, setPreset] = useState("100");
  const [custom, setCustom] = useState(100);
  const [direction, setDirection] = useState<ScaleDirection>("real");
  const [value, setValue] = useState(1);
  const unit = direction === "real" ? "m" : "cm";
  return (
    <FieldExtraCard
      tool="escalas"
      calculate={() => ({
        rows: [
          {
            label: direction === "real" ? "Longitud real" : "Longitud en plano",
            value:
              format(
                convertScale(value, preset === "custom" ? custom : Number(preset), direction),
              ) +
              " " +
              unit,
          },
        ],
      })}
    >
      <div className="field-grid">
        <label>
          Escala
          <select
            className="input"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          >
            {SCALE_PRESETS.map((scale) => (
              <option value={scale} key={scale}>
                1:{scale}
              </option>
            ))}
            <option value="custom">Libre</option>
          </select>
        </label>
        <label>
          Sentido
          <select
            className="input"
            value={direction}
            onChange={(event) => setDirection(event.target.value as ScaleDirection)}
          >
            <option value="real">Plano → realidad</option>
            <option value="plano">Realidad → plano</option>
          </select>
        </label>
        {preset === "custom" && (
          <NumberField
            label="Denominador de escala"
            value={custom}
            onValueChange={(n) => setCustom(n ?? NaN)}
          />
        )}
        <NumberField
          label={direction === "real" ? "Longitud en plano" : "Longitud real"}
          unit={direction === "real" ? "cm" : "m"}
          value={value}
          onValueChange={(n) => setValue(n ?? NaN)}
        />
      </div>
    </FieldExtraCard>
  );
}

function RoofCalculator() {
  const [rise, setRise] = useState(1);
  const [run, setRun] = useState(4);
  return (
    <FieldExtraCard
      tool="techo"
      calculate={() => {
        const pitch = roofPitch(rise, run);
        return {
          rows: [
            { label: "Pendiente", value: format(pitch.percent) + " %" },
            { label: "Ángulo", value: format(pitch.degrees) + "°" },
            {
              label: "Relación",
              value: pitch.denominator === null ? "Horizontal" : "1:" + format(pitch.denominator),
            },
            { label: "Longitud real de vertiente", value: format(pitch.length) + " m" },
          ],
        };
      }}
    >
      <div className="field-grid">
        <NumberField
          label="Desnivel"
          unit="m"
          value={rise}
          onValueChange={(n) => setRise(n ?? NaN)}
        />
        <NumberField
          label="Proyección horizontal"
          unit="m"
          value={run}
          onValueChange={(n) => setRun(n ?? NaN)}
        />
      </div>
    </FieldExtraCard>
  );
}

function CoverageCalculator() {
  const [lot, setLot] = useState(120);
  const [floor, setFloor] = useState(80);
  const [total, setTotal] = useState(160);
  return (
    <FieldExtraCard
      tool="ocupacion"
      note={OCCUPANCY_NOTE}
      calculate={() => {
        const result = lotCoverage(lot, floor, total);
        return {
          warning: result.warning,
          rows: [
            { label: "Ocupación", value: format(result.occupancy, 2) + " %" },
            { label: "Área libre", value: format(result.freeArea, 2) + " %" },
            { label: "Coeficiente de edificación", value: format(result.coefficient) },
          ],
        };
      }}
    >
      <div className="field-grid">
        <NumberField
          label="Área de lote"
          unit="m²"
          value={lot}
          onValueChange={(n) => setLot(n ?? NaN)}
        />
        <NumberField
          label="Área techada del primer piso"
          unit="m²"
          value={floor}
          onValueChange={(n) => setFloor(n ?? NaN)}
        />
        <NumberField
          label="Área techada total"
          unit="m²"
          value={total}
          onValueChange={(n) => setTotal(n ?? NaN)}
        />
      </div>
    </FieldExtraCard>
  );
}

function FeetCalculator() {
  const [toMetric, setToMetric] = useState(true);
  const [feet, setFeet] = useState(1);
  const [inches, setInches] = useState("0");
  const [meters, setMeters] = useState(1);
  return (
    <FieldExtraCard
      tool="pies"
      calculate={() => {
        if (toMetric) {
          const length = imperialToMetric(feet, inches);
          return {
            rows: [
              { label: "Metros", value: format(length.meters, 6) + " m" },
              { label: "Centímetros", value: format(length.centimeters) + " cm" },
            ],
          };
        }
        const { decimal, fractional } = metricToImperial(meters);
        return {
          rows: [
            {
              label: "Pulgadas decimales",
              value: decimal.feet + " ft " + decimal.inches.toFixed(2) + " in",
            },
            {
              label: "Fracción al 1/16″ más cercano",
              value: fractional.feet + " ft " + fractional.inches + " in",
            },
          ],
        };
      }}
    >
      <label>
        Sentido
        <select
          className="input"
          value={toMetric ? "metric" : "imperial"}
          onChange={(event) => setToMetric(event.target.value === "metric")}
        >
          <option value="metric">Pies y pulgadas → metros</option>
          <option value="imperial">Metros → pies y pulgadas</option>
        </select>
      </label>
      {toMetric ? (
        <div className="field-grid">
          <NumberField
            label="Pies"
            unit="ft"
            value={feet}
            onValueChange={(n) => setFeet(n ?? NaN)}
          />
          {/* Text, not NumberField: inches accept fractions such as "5 3/8". Same markup for a matching label. */}
          <div className="field">
            <label htmlFor="field-extra-inches">
              Pulgadas<span className="mono muted"> · in</span>
            </label>
            <input
              id="field-extra-inches"
              className="input"
              value={inches}
              placeholder="Ej. 5 3/8"
              onChange={(event) => setInches(event.target.value)}
            />
          </div>
        </div>
      ) : (
        <NumberField
          label="Metros"
          unit="m"
          value={meters}
          onValueChange={(n) => setMeters(n ?? NaN)}
        />
      )}
    </FieldExtraCard>
  );
}

const calculators = {
  escalas: ScaleCalculator,
  techo: RoofCalculator,
  ocupacion: CoverageCalculator,
  pies: FeetCalculator,
};
export function FieldExtraCalculators({ tool }: { tool: FieldExtraTool }) {
  const Calculator = calculators[tool];
  return <Calculator />;
}
