import type { PocketMeasure } from "@/data/medidas";
/** Dibujo propio: envolvente esquemática, no plano de distribución. */
export function PocketDiagram({ measure: m }: { measure: PocketMeasure }) {
  const { depth } = m;
  const value = `${m.width} ${m.unit === "m²/persona" ? "m² por persona" : (m.unit ?? "m")}`;
  if (m.diagram === "ratio") {
    return (
      <svg
        viewBox="0 0 300 280"
        role="img"
        aria-label={m.title + ": " + value}
        style={{ width: "100%", maxHeight: 240 }}
      >
        <rect
          x="55"
          y="45"
          width="190"
          height="190"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text
          x="150"
          y="140"
          fill="currentColor"
          fontSize="15"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {value}
        </text>
      </svg>
    );
  }

  if (m.diagram === "cota" || depth === null) {
    const label = m.valueLabel ?? "Ancho";
    const vertical = label.startsWith("Altura");
    return (
      <svg
        viewBox="0 0 300 280"
        role="img"
        aria-label={`${m.title}: ${label}, ${value}`}
        style={{ width: "100%", maxHeight: 240 }}
      >
        <path
          d={vertical ? "M75 45v190M67 45h16m-16 190h16" : "M40 125h220M40 117v16m220-16v16"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text
          x={vertical ? 180 : 150}
          y={vertical ? 135 : 153}
          fill="currentColor"
          fontSize="14"
          textAnchor="middle"
        >
          <tspan>{label}</tspan>
          <tspan x={vertical ? 180 : 150} dy="21">
            {value}
          </tspan>
        </text>
      </svg>
    );
  }

  const w = (190 * m.width) / Math.max(m.width, depth);
  const h = (190 * depth) / Math.max(m.width, depth);
  return (
    <svg
      viewBox="0 0 300 280"
      role="img"
      aria-label={`${m.title}: ${m.width} por ${depth} metros`}
      style={{ width: "100%", maxHeight: 240 }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {m.diagram === "persona" ? (
          <>
            <circle cx="150" cy="50" r="18" />
            <path d="M150 68v95m-30-70h60m-30 70-25 65m25-65 25 65" />
          </>
        ) : (
          <rect x={150 - w / 2} y="30" width={w} height={h} rx={m.diagram === "mueble" ? 8 : 0} />
        )}
        <path d="M40 245H260M40 239v12m220-12v12M275 30v190m-6-190h12m-12 190h12" />
      </g>
      <g fill="currentColor" fontSize="14" textAnchor="middle">
        <text x="150" y="270">
          {m.width} m
        </text>
        <text x="265" y="125" transform="rotate(-90 265 125)">
          {depth} m
        </text>
      </g>
    </svg>
  );
}
