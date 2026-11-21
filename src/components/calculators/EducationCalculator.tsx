"use client";

import { useState } from "react";
import { Card, NumberField, Select } from "@/components/ui";
import {
  A040_CODE,
  A040_LEGAL_NOTE,
  MINEDU208_CODE,
  MINEDU208_FREE_AREA,
  MINEDU208_LEGAL_NOTE,
  MINEDU208_MAX_FLOORS,
  MINEDU208_ROOMS,
  type TerrainType,
} from "@/data/norms/education";
import { formatFixtures } from "@/lib/calculators/a090";
import {
  EDU_LEVELS,
  a040DoorsRequired,
  a040Occupants,
  a040StairsRequired,
  a040StudentFixtures,
  minedu208Applies,
  minedu208ClassroomArea,
  minedu208FloorsOk,
  minedu208FreeArea,
  minedu208Library,
  minedu208Sum,
  type EduLevel,
  type EduRegime,
} from "@/lib/calculators/education";
import type { CalcCheck } from "@/lib/calculators/types";
import { CalculatorResult } from "./CalculatorResult";

const regimes = [
  { value: "a040", label: "Mínimo RNE A.040" },
  { value: "minedu208", label: "Estándar RVM 208-2019-MINEDU" },
];

const terrainOptions = (Object.keys(MINEDU208_FREE_AREA) as TerrainType[]).map((value) => ({
  value,
  label: value === "privada" ? "Privada" : value,
}));

const designNote =
  "Para fines de diseño de ambientes se consideran los índices de ocupación de la normativa específica del MINEDU según el tipo de servicio educativo.";
const scopeNote =
  "La RVM 208-2019-MINEDU regula solo primaria y secundaria. Para este nivel se aplica la A.040.";
const nurseryNote =
  "Para el Ciclo I (Cuna) no se requiere diferenciar SS.HH. por sexo ni es obligatorio incluir urinarios; en el Ciclo II (Jardín) se diferencia por sexo.";

function areaText(area: number): string {
  return `${area.toFixed(2)} m²`;
}

function information(label: string, value: string, ref: string): CalcCheck {
  return { label, value, ref, limit: "", pass: true, informational: true };
}

function integerError(value: number | null): string | undefined {
  return value !== null && !Number.isSafeInteger(value)
    ? "Ingresa un número entero válido."
    : undefined;
}

function sanitaryChecks(level: EduLevel, students: number) {
  const fixtures = a040StudentFixtures(level, students);
  const men = formatFixtures(fixtures.men);
  const women = formatFixtures(fixtures.women, false);
  const checks = [
    information(
      "Dotación de estudiantes",
      `Hombres: ${men} · Mujeres: ${women}. L = lavatorios, u = urinarios, I = inodoros.`,
      fixtures.ref,
    ),
    information(
      "Distribución de estudiantes",
      `Proporción igual de hombres y mujeres (puede variar si se sustenta). Se consideran ${fixtures.perGroup} por grupo en el cálculo.`,
      "A.040 · Art. 20.1",
    ),
    information(
      "Aparatos accesibles",
      "En cada piso, al menos un lavatorio, un inodoro y un urinario para personas con discapacidad y adultos mayores, pudiendo ser de uso mixto.",
      "A.040 · Art. 20.2",
    ),
  ];
  if (level === "inicial") checks.push(information("Ciclo I (Cuna)", nurseryNote, fixtures.ref));
  return { fixtures, men, women, checks };
}

function a040Checks(floors: number, projectedArea: number | null): CalcCheck[] {
  const stairs = a040StairsRequired(floors);
  const checks = [
    information("Diseño de ambientes", designNote, "A.040 · Art. 13.1"),
    information(
      "Escaleras de evacuación",
      stairs
        ? `Mínimo ${stairs}. El Art. 18 permite una sola escalera si se cumplen simultáneamente las condiciones de pisos, carga de evacuantes, salida directa para rescate y distancia de viaje.`
        : "El mínimo de dos escaleras de evacuación se aplica a edificaciones de más de un piso.",
      "A.040 · Art. 18",
    ),
    information("Altura libre mínima", "2.50 m", "A.040 · Art. 9"),
    information("Ancho mínimo de vano de puerta", "1.00 m", "A.040 · Art. 16.1"),
  ];
  if (projectedArea !== null) {
    const occupants = a040Occupants("aulas", projectedArea);
    checks.push(
      information(
        "Ocupantes para evacuación",
        `${occupants} personas para ${areaText(projectedArea)}`,
        "A.040 · Art. 13.2 · Cuadro N° 3",
      ),
      information("Puertas requeridas", String(a040DoorsRequired(occupants)), "A.040 · Art. 16.2"),
    );
  }
  return checks;
}

function mineduResults(
  level: "primaria" | "secundaria",
  students: number,
  sections: number,
  floors: number,
  terrain: TerrainType,
  terrainArea: number | null,
  exceptional: boolean,
) {
  const perSection = Math.ceil(students / sections);
  const classroom = minedu208ClassroomArea(perSection, exceptional);
  const library = minedu208Library(sections, level);
  const sum = minedu208Sum(students, sections);
  const floorsRef = "MINEDU 208 · Cuadro N° 6";
  const checks = [
    information(
      "Área de aulas",
      `${areaText(classroom)} por sección · ${areaText(sections * classroom)} en total`,
      exceptional ? "MINEDU 208 · Num. 11.1.1 d)" : "MINEDU 208 · Cuadro N° 12",
    ),
    ...MINEDU208_ROOMS.filter(({ levels }) => levels.some((item) => item === level)).map(
      ({ name, area, io, capacity, ref }) =>
        information(
          `${name} · estándar`,
          `${areaText(area)} para ${capacity} estudiantes · I.O. ${areaText(io)}/est.`,
          ref,
        ),
    ),
    information(
      "Biblioteca",
      library.type === null
        ? library.reason
        : `Tipo ${library.type} · ${areaText(library.area)} + aprox. 25% de depósito`,
      library.ref,
    ),
    information(
      "SUM",
      `${areaText(sum.area)} · I.O. 1.00 m² por estudiante. ${
        sum.rule === "tope-300"
          ? "A partir de 05 secciones: el área no debe ser mayor a 300.00 m²."
          : "Menos de 05 secciones: el área no debe ser menor que el área de taller o laboratorio."
      }`,
      sum.ref,
    ),
    terrain === "privada"
      ? information(
          "Número de pisos",
          `${floors} · El máximo de ${MINEDU208_MAX_FLOORS} pisos corresponde a IIEE públicas.`,
          floorsRef,
        )
      : {
          label: "Número de pisos en IIEE públicas",
          value: floors,
          limit: MINEDU208_MAX_FLOORS,
          pass: minedu208FloorsOk(floors),
          ref: floorsRef,
        },
    information("SS.HH. de estudiantes", "Según la Norma A.040.", "MINEDU 208 · Cuadro N° 35"),
  ];
  if (terrainArea !== null) {
    checks.push(
      information(
        "Área libre mínima",
        `${areaText(minedu208FreeArea(terrain, terrainArea))} · ${MINEDU208_FREE_AREA[terrain] * 100}% del área de intervención. Se aplica si las normas del gobierno local o regional no lo precisan.`,
        "MINEDU 208 · Cuadro N° 7",
      ),
    );
  }
  if (exceptional) {
    checks.push(
      information(
        "Condiciones del I.O. excepcional",
        "De manera excepcional, en IIEE que consideren mobiliario perimetral en uno de los lados o no lo consideren, se puede considerar un índice de ocupación no menor a 1.67 m² por estudiante, siempre que exista un espacio próximo al aula o mobiliario que garantice el acceso a los recursos educativos. Debe garantizarse el ancho de circulación libre interior para evacuación.",
        "MINEDU 208 · Num. 11.1.1 d)",
      ),
    );
  }
  return {
    main: `Aulas: ${sections} × ${areaText(classroom)}`,
    details: `${perSection} estudiantes por sección · ${areaText(sections * classroom)} en aulas · ${MINEDU208_CODE} · ${exceptional ? "Num. 11.1.1 d)" : "Cuadro N° 12"}`,
    checks,
  };
}

export function EducationCalculator() {
  const [level, setLevel] = useState<EduLevel>("primaria");
  const [regime, setRegime] = useState<EduRegime>("a040");
  const [students, setStudents] = useState<number | null>(null);
  const [sections, setSections] = useState<number | null>(null);
  const [floors, setFloors] = useState<number | null>(1);
  const [terrain, setTerrain] = useState<TerrainType>("I");
  const [terrainArea, setTerrainArea] = useState<number | null>(null);
  const [exceptional, setExceptional] = useState(false);
  const [projectedArea, setProjectedArea] = useState<number | null>(null);

  const usesMinedu = regime === "minedu208" && minedu208Applies(level);
  const studentsError = integerError(students);
  const sectionsError = integerError(sections);
  const floorsError = integerError(floors);
  const warnings = regime === "minedu208" && !usesMinedu ? [scopeNote] : [];
  const disclaimer = usesMinedu ? `${A040_LEGAL_NOTE} ${MINEDU208_LEGAL_NOTE}` : A040_LEGAL_NOTE;

  let result: { main: string; details: string; checks: CalcCheck[] } | undefined;
  if (students !== null && floors !== null && !studentsError && !floorsError) {
    const { fixtures, men, women, checks } = sanitaryChecks(level, students);
    if (!usesMinedu) {
      result = {
        main: `SS.HH.: H ${men} · M ${women}`,
        details: `${fixtures.ref} · ${students} estudiantes en el turno de mayor concurrencia`,
        checks: [...checks, ...a040Checks(floors, projectedArea)],
      };
    } else if (
      sections !== null &&
      !sectionsError &&
      (level === "primaria" || level === "secundaria")
    ) {
      const minedu = mineduResults(
        level,
        students,
        sections,
        floors,
        terrain,
        terrainArea,
        exceptional,
      );
      result = { ...minedu, checks: [...minedu.checks, ...checks] };
    }
  }

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">Entrada / {usesMinedu ? MINEDU208_CODE : A040_CODE}</div>
        <h2>Infraestructura educativa</h2>
        {warnings.map((warning) => (
          <p className="warning" key={warning}>
            {warning}
          </p>
        ))}
        <div className="field-grid">
          <Select
            label="Nivel"
            value={level}
            onChange={(event) => setLevel(event.target.value as EduLevel)}
            options={EDU_LEVELS.map(({ id, label }) => ({ value: id, label }))}
          />
          <Select
            label="Régimen"
            value={regime}
            onChange={(event) => setRegime(event.target.value as EduRegime)}
            options={regimes}
          />
          <NumberField
            label="N° de estudiantes del turno de mayor concurrencia"
            value={students}
            min={0}
            error={studentsError}
            onValueChange={setStudents}
          />
          <NumberField
            label="N° de secciones"
            value={sections}
            min={1}
            disabled={!usesMinedu}
            error={usesMinedu ? sectionsError : undefined}
            onValueChange={setSections}
          />
          <NumberField
            label="N° de pisos"
            value={floors}
            min={1}
            error={floorsError}
            onValueChange={setFloors}
          />
          {usesMinedu ? (
            <>
              <Select
                label="Tipo de terreno"
                value={terrain}
                onChange={(event) => setTerrain(event.target.value as TerrainType)}
                options={terrainOptions}
              />
              <NumberField
                key="terrain-area"
                label="Área de intervención del terreno"
                value={terrainArea}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                unit="m²"
                hint="Opcional"
                onValueChange={setTerrainArea}
              />
            </>
          ) : (
            <NumberField
              key="projected-area"
              label="Área de aula proyectada"
              value={projectedArea}
              min={0}
              max={Number.MAX_SAFE_INTEGER}
              unit="m²"
              hint="Opcional. Calcula los ocupantes para evacuación y las puertas requeridas."
              onValueChange={setProjectedArea}
            />
          )}
        </div>
        {usesMinedu && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={exceptional}
              onChange={(event) => setExceptional(event.target.checked)}
            />
            Aula con I.O. excepcional (1.67 m²/est.)
          </label>
        )}
      </Card>
      <div className="calculator-visual">
        {result ? (
          <CalculatorResult
            eyebrow={`RESULTADO / ${usesMinedu ? MINEDU208_CODE : A040_CODE}`}
            {...result}
            warnings={[]}
            disclaimer={disclaimer}
            copyText={[
              result.main,
              result.details,
              ...result.checks.map(
                ({ label, value, ref, informational, limit }) =>
                  `${label}: ${value}${informational ? "" : ` · límite ${limit}`} · ${ref}`,
              ),
              ...warnings,
            ].join("\n")}
          />
        ) : (
          <Card className="calculator-result">
            <p className="muted">
              {usesMinedu
                ? "Ingresa el número de estudiantes, secciones y pisos para calcular."
                : "Ingresa el número de estudiantes y pisos para calcular."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
