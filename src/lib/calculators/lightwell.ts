import { invalidResult, type CalcResult } from "./types";
export interface LightWellInput {
  wallHeight: number;
  kind: "habitable" | "servicios";
  proposedSide?: number;
  sides?: 1 | 2 | 3 | 4;
  building?: "bifamiliar" | "multifamiliar";
}
export interface LightWellValues {
  minSide: number;
  minimumSide: number;
  baseSide: number;
  ratio: number;
}
export function computeLightWell(p: LightWellInput): CalcResult<LightWellValues> {
  const sides = p.sides ?? 2,
    building = p.building ?? "multifamiliar",
    zero = { minSide: 0, minimumSide: 0, baseSide: 0, ratio: 0 };
  if (
    !Number.isFinite(p.wallHeight) ||
    p.wallHeight <= 0 ||
    ![1, 2, 3, 4].includes(sides) ||
    (p.proposedSide !== undefined && (!Number.isFinite(p.proposedSide) || p.proposedSide <= 0))
  )
    return invalidResult(zero, "Dimensiones positivas y entre 1 y 4 lados propios requeridos.");
  const rates =
    p.kind === "habitable"
      ? sides <= 2
        ? [0.3, 0.15, 0.1, 0.1]
        : [0.35, 0.25, 0.15, 0.15]
      : sides <= 2
        ? [0.25, 0.13, 0.1, 0.1]
        : [0.3, 0.16, 0.13, 0.13];
  let distance = 0;
  for (let i = 0; i < 4; i++)
    distance += Math.max(0, Math.min(18, p.wallHeight - 18 * i)) * rates[i];
  distance += Math.max(0, p.wallHeight - 72) * 0.1;
  const baseSide = building === "multifamiliar" ? 2.1 : p.kind === "habitable" ? 2 : 1.8;
  const minSide = Math.max(baseSide, distance);
  return {
    ok: (p.proposedSide ?? minSide) >= minSide,
    values: { minSide, minimumSide: minSide, baseSide, ratio: 0 },
    checks: [
      {
        label: "Distancia perpendicular mínima",
        pass: (p.proposedSide ?? minSide) >= minSide,
        value: p.proposedSide ?? minSide,
        limit: minSide,
        ref: "A.020-2021 art. 11.3.b, cuadro 4",
      },
    ],
    warnings: [
      "Modelo de vivienda bifamiliar/multifamiliar. H desde alféizar más bajo o 1.00 m sobre piso hasta parapeto superior; verificar lados propios, distancia paralela, compensación y retranques conforme notas del cuadro 4. No aplica a otros usos.",
    ],
  };
}
export function calculateLightWell(
  wallHeight: number,
  kind: "habitable" | "services" = "habitable",
) {
  return computeLightWell({ wallHeight, kind: kind === "services" ? "servicios" : kind });
}
export { RNE_WARNING } from "./types";
