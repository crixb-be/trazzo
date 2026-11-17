/** E.030 RM 183-2026: tablas 1,4,5,6 y arts.18.3,26,34. Sin Vs30 se usa la nota de tablas4/5. */
export const ZONES = { 1: 0.1, 2: 0.25, 3: 0.35, 4: 0.45 } as const;
export function site2026(zone: 1 | 2 | 3 | 4, soil: "S0" | "S1" | "S2" | "S3" | "S4") {
  if (soil === "S4" && zone === 4)
    throw new Error(
      "S4 en zona4 requiere análisis de respuesta de sitio; no existe valor tabulado.",
    );
  const s =
    soil === "S0"
      ? 0.8
      : soil === "S1"
        ? 1
        : soil === "S2"
          ? { 1: 1.3, 2: 1.3, 3: 1.15, 4: 1.1 }[zone]
          : soil === "S3"
            ? { 1: 1.6, 2: 1.4, 3: 1.2, 4: 1.2 }[zone]
            : { 1: 2.4, 2: 1.7, 3: 1.3, 4: 0 }[zone];
  return {
    S: s,
    TP: { S0: 0.3, S1: 0.4, S2: 0.6, S3: 0.9, S4: 1.2 }[soil],
    TL: { S0: 3, S1: 2.5, S2: 2, S3: 1.6, S4: 1.6 }[soil],
  };
}
export function seismic2026(p: {
  zone: 1 | 2 | 3 | 4;
  soil: "S0" | "S1" | "S2" | "S3" | "S4";
  period: number;
  U: number;
  R0: number;
  Ia: number;
  Ip: number;
  weight: number;
}) {
  if (
    !ZONES[p.zone] ||
    [p.period, p.weight].some((n) => !Number.isFinite(n) || n < 0) ||
    [p.U, p.R0, p.Ia, p.Ip].some((n) => !Number.isFinite(n) || n <= 0) ||
    p.Ia > 1 ||
    p.Ip > 1
  )
    throw new Error("Parámetros sísmicos inválidos.");
  const site = site2026(p.zone, p.soil),
    T = p.period;
  const C =
    T < 0.2 * site.TP
      ? 1 + (7.5 * T) / site.TP
      : T <= site.TP
        ? 2.5
        : T <= site.TL
          ? (2.5 * site.TP) / T
          : (2.5 * site.TP * site.TL) / (T * T);
  const Cstatic = T <= site.TP ? 2.5 : C,
    R = p.R0 * p.Ia * p.Ip,
    ratio = Math.max(Cstatic / R, 0.11);
  return {
    ...site,
    Z: ZONES[p.zone],
    C,
    Cstatic,
    R,
    V: ZONES[p.zone] * p.U * site.S * ratio * p.weight,
  };
}
