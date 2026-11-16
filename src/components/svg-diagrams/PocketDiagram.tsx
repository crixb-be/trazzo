import type { PocketMeasure } from "@/data/medidas";
/** Dibujo propio: envolvente esquemática, no plano de distribución. */
export function PocketDiagram({ measure: m }: { measure: PocketMeasure }) {
  const w = (190 * m.width) / Math.max(m.width, m.depth);
  const h = (190 * m.depth) / Math.max(m.width, m.depth);
  return (
    <svg
      viewBox="0 0 300 280"
      role="img"
      aria-label={`${m.title}: ${m.width} por ${m.depth} metros`}
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
          {m.depth} m
        </text>
      </g>
    </svg>
  );
}
