/** Reserva A.120-2023 RM075, art.20, contrastada con el PDF aportado. */
export function accessibleParking(total: number) {
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error("Introduce un total entero no negativo.");
  if (total <= 500) return Math.ceil(total * 0.04);
  return 20 + Math.ceil((total - 500) / 100);
}
