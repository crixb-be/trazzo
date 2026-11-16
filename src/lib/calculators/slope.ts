export function computeSlope(value: number, unit: "porcentaje" | "grados" | "relación") {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (unit === "grados" && value >= 90) ||
    (unit === "relación" && value === 0)
  )
    throw new Error("Usa una pendiente no negativa, ángulo menor de 90° o denominador positivo.");
  const ratio =
    unit === "grados"
      ? Math.tan((value * Math.PI) / 180)
      : unit === "relación"
        ? 1 / value
        : value / 100;
  return {
    percent: ratio * 100,
    degrees: (Math.atan(ratio) * 180) / Math.PI,
    denominator: ratio === 0 ? null : 1 / ratio,
  };
}
