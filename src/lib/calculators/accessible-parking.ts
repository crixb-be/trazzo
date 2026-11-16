/** Reserva referencial A.120; tabla pendiente de contraste con edición vigente. */
export function accessibleParking(total: number) {
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error("Introduce un total entero no negativo.");
  if (total === 0) return 0;
  if (total <= 20) return 1;
  if (total <= 50) return 2;
  if (total <= 400) return Math.ceil(total / 50) * 2;
  return 16 + Math.ceil((total - 400) / 100);
}
