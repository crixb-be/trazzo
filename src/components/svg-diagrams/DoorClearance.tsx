import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface DoorClearanceProps {
  width?: number;
  height?: number;
  showElevation?: boolean;
}

const WALL = 0.15;
const JAMB = 0.45;
const GAP = 0.9;

/** Door plan with true swing arc, plus an optional elevation with clear height. */
export function DoorClearance({
  width = 0.9,
  height = 2.1,
  showElevation = true,
}: DoorClearanceProps) {
  const clearWidth = Math.max(0.6, finiteOr(width, 0.9));
  const clearHeight = Math.max(1.8, finiteOr(height, 2.1));

  const planWidth = JAMB * 2 + clearWidth;
  const planHeight = WALL + clearWidth;
  const elevationX = planWidth + GAP;
  const elevationWidth = clearWidth + 0.3;
  const frameWidth = showElevation ? elevationX + elevationWidth : planWidth;
  const frameHeight = showElevation ? Math.max(planHeight, clearHeight + 0.1) : planHeight;
  const scale = createDiagramScale(frameWidth, frameHeight);

  const planTop = frameHeight - planHeight;
  const hingeX = JAMB;
  const hingeY = planTop + WALL;
  const ground = frameHeight;
  const doorLeft = elevationX + 0.15;

  return (
    <DiagramFrame
      widthMeters={frameWidth}
      heightMeters={frameHeight}
      scale={scale}
      title="PUERTA / LUZ LIBRE"
      normReference="A.120 · Art. 9 / A.010 · Vanos"
      ariaLabel={`Planta de puerta con arco de giro: ancho libre ${clearWidth.toFixed(2)} m, altura ${clearHeight.toFixed(2)} m`}
      notes={[`ANCHO LIBRE ${clearWidth.toFixed(2)} m · ALTURA ${clearHeight.toFixed(2)} m`]}
    >
      {/* Plan: wall stubs, open leaf and swing arc */}
      <rect
        x={0}
        y={scale(planTop)}
        width={scale(JAMB)}
        height={scale(WALL)}
        fill="var(--surface-2)"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      <rect
        x={scale(JAMB + clearWidth)}
        y={scale(planTop)}
        width={scale(JAMB)}
        height={scale(WALL)}
        fill="var(--surface-2)"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      <line
        x1={scale(hingeX)}
        y1={scale(hingeY)}
        x2={scale(hingeX)}
        y2={scale(hingeY + clearWidth)}
        stroke="var(--text)"
        strokeWidth="2"
      />
      <path
        d={`M ${scale(hingeX)} ${scale(hingeY + clearWidth)} A ${scale(clearWidth)} ${scale(clearWidth)} 0 0 0 ${scale(hingeX + clearWidth)} ${scale(hingeY)}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.25"
        strokeDasharray="6 4"
      />
      <text x={0} y={scale(ground) + 34} className="diagram-label-text">
        PLANTA
      </text>
      <Dimension
        x1={JAMB}
        y1={planTop}
        x2={JAMB + clearWidth}
        y2={planTop}
        label={`${clearWidth.toFixed(2)} m`}
        offset={-18}
      />

      {showElevation && (
        <>
          <line
            x1={scale(elevationX)}
            y1={scale(ground)}
            x2={scale(elevationX + elevationWidth)}
            y2={scale(ground)}
            stroke="var(--text)"
            strokeWidth="2"
          />
          <rect
            x={scale(doorLeft)}
            y={scale(ground - clearHeight)}
            width={scale(clearWidth)}
            height={scale(clearHeight)}
            fill="var(--accent)"
            fillOpacity="0.1"
            stroke="var(--text)"
            strokeWidth="1.5"
          />
          <Dimension
            x1={doorLeft + clearWidth}
            y1={ground}
            x2={doorLeft + clearWidth}
            y2={ground - clearHeight}
            label={`${clearHeight.toFixed(2)} m`}
            orientation="vertical"
          />
          <text x={scale(elevationX)} y={scale(ground) + 34} className="diagram-label-text">
            ELEVACIÓN
          </text>
        </>
      )}
    </DiagramFrame>
  );
}
