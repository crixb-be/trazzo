/** Referencias de anteproyecto pendientes de contraste con la edición vigente. */
export const OCCUPANCY_USES = {
  oficina: { label: "Oficinas", factor: 9.5, ref: "A.080 · art. 6" },
  comercio: { label: "Tienda (área de venta)", factor: 2.8, ref: "A.070 · aforo por actividad" },
  restaurante: { label: "Restaurante (mesas)", factor: 1.5, ref: "A.070 · aforo por actividad" },
  aula: { label: "Aula", factor: 1.5, ref: "A.040 · aforo por ambiente" },
};
export function computeOccupancy(area: number, factor: number) {
  if (!Number.isFinite(area) || area < 0 || !Number.isFinite(factor) || factor <= 0)
    throw new Error("Área no negativa y factor m²/persona positivo requeridos.");
  return Math.ceil(area / factor);
}
