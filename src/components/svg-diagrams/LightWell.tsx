import { computeLightWell } from "@/lib/calculators/lightwell";
import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface LightWellProps {
  wallHeight?: number;
  height?: number;
  kind?: "habitable" | "servicios" | "services";
  proposedSide?: number;
  side?: number;
  sides?: 1 | 2 | 3 | 4;
  building?: "bifamiliar" | "multifamiliar";
}

const WALL = 0.15;
const GAP = 1.2;

/** Esquema de A.020-2021, cuadro4. */
export function LightWell({
  wallHeight,
  height,
  kind = "habitable",
  proposedSide,
  side,
  sides = 2,
  building = "multifamiliar",
}: LightWellProps) {
  const safeHeight = Math.max(2, finiteOr(wallHeight ?? height, 6));
  const normalizedKind = kind === "habitable" ? "habitable" : "servicios";
  const result = computeLightWell({
    wallHeight: safeHeight,
    kind: normalizedKind,
    sides,
    building,
  });
  const base = result.values.baseSide;
  const minimumSide = result.values.minSide;
  const wellSide = Math.max(minimumSide, finiteOr(proposedSide ?? side, minimumSide));

  const planSize = wellSide + WALL * 2;
  const sectionX = planSize + GAP;
  const frameWidth = sectionX + planSize;
  const frameHeight = Math.max(planSize, safeHeight);
  const scale = createDiagramScale(frameWidth, frameHeight);

  const planTop = frameHeight - planSize;
  const ground = frameHeight;
  const wallTop = ground - safeHeight;
  const leftWallX = sectionX;
  const rightWallX = sectionX + WALL + wellSide;

  return (
    <DiagramFrame
      widthMeters={frameWidth}
      heightMeters={frameHeight}
      scale={scale}
      title="POZO DE LUZ / H"
      normReference="A.020-2021 · art.11.3.b, cuadro4"
      ariaLabel={`Planta y sección de pozo de luz: altura ${safeHeight.toFixed(2)} m, lado ${wellSide.toFixed(2)} m`}
      notes={[
        `${normalizedKind.toUpperCase()} · ${sides} lados propios · ${building}`,
        `Suma por tramos de18 m; mínimo base ${base.toFixed(2)} m → L mín ${minimumSide.toFixed(2)} m`,
      ]}
    >
      {/* Plan */}
      <rect
        x={0}
        y={scale(planTop)}
        width={scale(planSize)}
        height={scale(planSize)}
        fill="var(--surface-2)"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      <rect
        x={scale(WALL)}
        y={scale(planTop + WALL)}
        width={scale(wellSide)}
        height={scale(wellSide)}
        fill="var(--accent)"
        fillOpacity="0.12"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <text x={0} y={scale(planTop) - 10} className="diagram-label-text">
        PLANTA
      </text>
      <Dimension
        x1={WALL}
        y1={planTop + WALL + wellSide}
        x2={WALL + wellSide}
        y2={planTop + WALL + wellSide}
        label={`L ${wellSide.toFixed(2)} m`}
        offset={WALL * scale(1) + 18}
      />

      {/* Section */}
      <rect
        x={scale(leftWallX)}
        y={scale(wallTop)}
        width={scale(WALL)}
        height={scale(safeHeight)}
        fill="var(--surface-2)"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      <rect
        x={scale(rightWallX)}
        y={scale(wallTop)}
        width={scale(WALL)}
        height={scale(safeHeight)}
        fill="var(--surface-2)"
        stroke="var(--text)"
        strokeWidth="1.5"
      />
      <rect
        x={scale(leftWallX + WALL)}
        y={scale(wallTop)}
        width={scale(wellSide)}
        height={scale(safeHeight)}
        fill="var(--accent)"
        fillOpacity="0.06"
      />
      <line
        x1={scale(leftWallX) - 6}
        y1={scale(ground)}
        x2={scale(rightWallX + WALL) + 6}
        y2={scale(ground)}
        stroke="var(--text)"
        strokeWidth="2"
      />
      <text x={scale(leftWallX)} y={scale(wallTop) - 10} className="diagram-label-text">
        SECCIÓN
      </text>
      <Dimension
        x1={leftWallX + WALL}
        y1={ground}
        x2={rightWallX}
        y2={ground}
        label={`L ${wellSide.toFixed(2)} m`}
      />
      <Dimension
        x1={rightWallX + WALL}
        y1={ground}
        x2={rightWallX + WALL}
        y2={wallTop}
        label={`H ${safeHeight.toFixed(2)} m`}
        orientation="vertical"
      />
    </DiagramFrame>
  );
}
