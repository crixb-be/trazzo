/** Aritmética de porcentajes configurables; no define un porcentaje normativo universal de iluminación. */
export function computeDaylight(
  area: number,
  lightPct: number,
  ventPct: number,
  glazing: number,
  opening: number,
) {
  if (
    [area, lightPct, ventPct, glazing, opening].some((v) => !Number.isFinite(v) || v < 0) ||
    lightPct > 100 ||
    ventPct > 100
  )
    throw new Error("Áreas no negativas y porcentajes entre 0 y 100 requeridos.");
  const requiredGlazing = (area * lightPct) / 100,
    requiredOpening = (area * ventPct) / 100;
  return {
    requiredGlazing,
    requiredOpening,
    lightPass: glazing >= requiredGlazing,
    ventPass: opening >= requiredOpening,
  };
}
