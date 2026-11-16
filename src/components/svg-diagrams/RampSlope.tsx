import { createDiagramScale, DiagramFrame, finiteOr, type DiagramScale } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface RampSlopeProps {
  rise?: number;
  width?: number;
  slope?: number;
  landing?: number;
}

const HANDRAIL_HEIGHT = 0.9;
/** Runs longer than this are drawn with a break line to stay legible. */
const MAX_UNBROKEN_RUN = 8;
const BROKEN_SEGMENT = 3;
const BREAK_GAP = 0.8;

interface Point {
  x: number;
  y: number;
}

function polyline(points: Point[], scale: DiagramScale): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scale(point.x)} ${scale(point.y)}`)
    .join(" ");
}

/** Zig-zag break mark centred on `x`, spanning from `top` to `bottom` (metres). */
function BreakMark({
  x,
  top,
  bottom,
  scale,
}: {
  x: number;
  top: number;
  bottom: number;
  scale: DiagramScale;
}) {
  const cx = scale(x);
  const y1 = scale(top) - 10;
  const y2 = scale(bottom) + 10;
  const mid = (y1 + y2) / 2;
  return (
    <path
      d={`M ${cx} ${y1} L ${cx} ${mid - 6} L ${cx - 5} ${mid - 2} L ${cx + 5} ${mid + 2} L ${cx} ${mid + 6} L ${cx} ${y2}`}
      fill="none"
      stroke="var(--muted)"
      strokeWidth="1"
    />
  );
}

/** Section of a ramp: landings, true slope, rise, run and handrail. */
export function RampSlope({ rise = 0.75, width = 1, slope = 0.1, landing = 1.5 }: RampSlopeProps) {
  const safeRise = Math.max(0.05, finiteOr(rise, 0.75));
  const safeSlope = Math.max(0.01, finiteOr(slope, 0.1));
  const safeLanding = Math.max(0.9, finiteOr(landing, 1.5));
  const safeWidth = Math.max(0.6, finiteOr(width, 1));
  const run = safeRise / safeSlope;
  const broken = run > MAX_UNBROKEN_RUN;
  const drawnRun = broken ? BROKEN_SEGMENT * 2 + BREAK_GAP : run;

  const frameWidth = safeLanding * 2 + drawnRun;
  const frameHeight = safeRise + HANDRAIL_HEIGHT + 0.1;
  const scale = createDiagramScale(frameWidth, frameHeight);

  const base = frameHeight;
  const top = base - safeRise;
  const rampStart = safeLanding;
  const rampEnd = safeLanding + drawnRun;
  const end = frameWidth;

  // Walking surface, split in two true-slope pieces when the run is broken.
  const lowerPiece: Point[] = broken
    ? [
        { x: rampStart, y: base },
        { x: rampStart + BROKEN_SEGMENT, y: base - BROKEN_SEGMENT * safeSlope },
      ]
    : [
        { x: rampStart, y: base },
        { x: rampEnd, y: top },
      ];
  const upperPiece: Point[] = broken
    ? [
        { x: rampEnd - BROKEN_SEGMENT, y: top + BROKEN_SEGMENT * safeSlope },
        { x: rampEnd, y: top },
      ]
    : [];

  const surface: Point[][] = broken
    ? [
        [{ x: 0, y: base }, ...lowerPiece],
        [...upperPiece, { x: end, y: top }],
      ]
    : [[{ x: 0, y: base }, ...lowerPiece, { x: end, y: top }]];

  const solids = surface.map((points) => {
    const first = points[0];
    const last = points[points.length - 1];
    return `${polyline(points, scale)} L ${scale(last.x)} ${scale(base)} L ${scale(first.x)} ${scale(base)} Z`;
  });

  const rails = surface.map((points) =>
    polyline(
      points.map((point) => ({ x: point.x, y: point.y - HANDRAIL_HEIGHT })),
      scale,
    ),
  );

  const slopeAngle = (Math.atan2(-safeRise, run) * 180) / Math.PI;
  const labelX = scale((lowerPiece[0].x + lowerPiece[1].x) / 2);
  const labelY = scale((lowerPiece[0].y + lowerPiece[1].y) / 2) - 8;
  const posts = [rampStart, rampEnd];

  return (
    <DiagramFrame
      widthMeters={frameWidth}
      heightMeters={frameHeight}
      scale={scale}
      title="RAMPA / SECCIÓN"
      normReference="A.120 · Art. 9"
      ariaLabel={`Sección de rampa: desnivel ${safeRise.toFixed(2)} m, pendiente ${(safeSlope * 100).toFixed(1)} %, longitud ${run.toFixed(2)} m`}
      notes={[
        `PENDIENTE ${(safeSlope * 100).toFixed(1)} % · ANCHO ${safeWidth.toFixed(2)} m`,
        `DESCANSOS ≥ ${safeLanding.toFixed(2)} m · PASAMANOS ${HANDRAIL_HEIGHT.toFixed(2)} m${broken ? " · TRAMO CORTADO" : ""}`,
      ]}
    >
      <line
        x1={0}
        y1={scale(base)}
        x2={scale(end)}
        y2={scale(base)}
        stroke="var(--text)"
        strokeWidth="2"
      />
      {solids.map((d) => (
        <path
          key={d}
          d={d}
          fill="var(--accent)"
          fillOpacity="0.14"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      {rails.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--text)" strokeWidth="1.5" />
      ))}
      {posts.map((x) => {
        const surfaceY = x === rampStart ? base : top;
        return (
          <line
            key={x}
            x1={scale(x)}
            y1={scale(surfaceY)}
            x2={scale(x)}
            y2={scale(surfaceY - HANDRAIL_HEIGHT)}
            stroke="var(--text)"
            strokeWidth="1"
          />
        );
      })}
      {broken && (
        <>
          <BreakMark
            x={rampStart + BROKEN_SEGMENT + BREAK_GAP * 0.3}
            top={top - HANDRAIL_HEIGHT}
            bottom={base}
            scale={scale}
          />
          <BreakMark
            x={rampEnd - BROKEN_SEGMENT - BREAK_GAP * 0.3}
            top={top - HANDRAIL_HEIGHT}
            bottom={base}
            scale={scale}
          />
        </>
      )}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        transform={broken ? undefined : `rotate(${slopeAngle} ${labelX} ${labelY})`}
        className="diagram-accent"
      >
        {(safeSlope * 100).toFixed(1)} %
      </text>

      <Dimension x1={0} y1={base} x2={rampStart} y2={base} label={safeLanding.toFixed(2)} />
      <Dimension x1={rampStart} y1={base} x2={rampEnd} y2={base} label={`${run.toFixed(2)} m`} />
      <Dimension x1={rampEnd} y1={base} x2={end} y2={base} label={safeLanding.toFixed(2)} />
      <Dimension
        x1={end}
        y1={base}
        x2={end}
        y2={top}
        label={`${safeRise.toFixed(2)} m`}
        orientation="vertical"
      />
    </DiagramFrame>
  );
}
