import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface WheelchairTurnProps {
  diameter?: number;
}

/** True-scale wheelchair turning circle with a top-view wheelchair silhouette. */
export function WheelchairTurn({ diameter = 1.5 }: WheelchairTurnProps) {
  const safeDiameter = Math.max(1, finiteOr(diameter, 1.5));
  const radius = safeDiameter / 2;
  const scale = createDiagramScale(safeDiameter, safeDiameter);
  const c = radius;

  return (
    <DiagramFrame
      widthMeters={safeDiameter}
      heightMeters={safeDiameter}
      scale={scale}
      title="GIRO DE SILLA DE RUEDAS"
      normReference="A.120-2023 · art.5.f (maniobra)"
      ariaLabel={`Círculo de giro de silla de ruedas de ${safeDiameter.toFixed(2)} m de diámetro`}
      notes={["ÁREA LIBRE DE MANIOBRA · SIN OBSTÁCULOS"]}
    >
      <circle
        cx={scale(c)}
        cy={scale(c)}
        r={scale(radius)}
        fill="var(--accent)"
        fillOpacity="0.08"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="8 5"
      />
      <line
        x1={0}
        y1={scale(c)}
        x2={scale(safeDiameter)}
        y2={scale(c)}
        stroke="var(--muted)"
        strokeWidth="0.75"
        strokeDasharray="4 4"
      />
      {/* Wheelchair, top view (≈ 0.70 × 1.20 m) */}
      <g stroke="var(--text)" fill="none" strokeWidth="1.5">
        <rect
          x={scale(c - 0.25)}
          y={scale(c - 0.3)}
          width={scale(0.5)}
          height={scale(0.5)}
          rx="3"
          fill="var(--surface-2)"
        />
        <rect
          x={scale(c - 0.35)}
          y={scale(c - 0.35)}
          width={scale(0.07)}
          height={scale(0.6)}
          rx="2"
          fill="var(--text)"
        />
        <rect
          x={scale(c + 0.28)}
          y={scale(c - 0.35)}
          width={scale(0.07)}
          height={scale(0.6)}
          rx="2"
          fill="var(--text)"
        />
        <path
          d={`M ${scale(c - 0.18)} ${scale(c + 0.2)} L ${scale(c - 0.15)} ${scale(c + 0.55)} M ${scale(c + 0.18)} ${scale(c + 0.2)} L ${scale(c + 0.15)} ${scale(c + 0.55)} M ${scale(c - 0.2)} ${scale(c + 0.55)} L ${scale(c + 0.2)} ${scale(c + 0.55)}`}
        />
        <circle cx={scale(c)} cy={scale(c - 0.05)} r={scale(0.11)} fill="var(--surface)" />
      </g>
      <Dimension
        x1={0}
        y1={safeDiameter}
        x2={safeDiameter}
        y2={safeDiameter}
        label={`Ø ${safeDiameter.toFixed(2)} m`}
      />
    </DiagramFrame>
  );
}
