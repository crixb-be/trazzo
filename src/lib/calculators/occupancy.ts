/** Factores contrastados con los PDFs del repositorio; no usar para otro ambiente. */
export const OCCUPANCY_USES = {
  oficina: { label: "Oficinas", factor: 9.5, ref: "A.080 · art. 6" },
  comercio: {
    label: "Tienda independiente en primer piso (nivel de acceso)",
    factor: 2.8,
    ref: "A.070-2021 · art. 8, cuadro 2",
  },
  restaurante: { label: "Restaurante (mesas)", factor: 1.5, ref: "A.070-2021 · art. 8, cuadro 2" },
  aula: { label: "Aula", factor: 1.5, ref: "A.040-2020 · art. 13.2, cuadro 3" },
};
export function computeOccupancy(area: number, factor: number) {
  if (!Number.isFinite(area) || area < 0 || !Number.isFinite(factor) || factor <= 0)
    throw new Error("Área no negativa y factor m²/persona positivo requeridos.");
  return Math.ceil(area / factor);
}
