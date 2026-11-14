import { useDiagramContext } from "./DiagramFrame";

export interface DimensionProps {
  /** Measured points, in metres. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  /**
   * Distance in px from the measured points to the dimension line. Negative
   * values place it above (horizontal) or to the left (vertical).
   */
  offset?: number;
  orientation?: "horizontal" | "vertical";
}

const EXTENSION_GAP = 3;
const EXTENSION_OVERSHOOT = 4;

/** Architectural dimension line: extension lines, arrows and a mono label. */
export function Dimension({ x1, y1, x2, y2, label, offset = 18, orientation }: DimensionProps) {
  const { scale, arrowMarkerId } = useDiagramContext();
  const horizontal = orientation
    ? orientation === "horizontal"
    : Math.abs(y2 - y1) <= Math.abs(x2 - x1);
  const direction = offset < 0 ? -1 : 1;

  const ax = scale(x1);
  const ay = scale(y1);
  const bx = scale(x2);
  const by = scale(y2);

  // Dimension line sits on a common baseline beyond the outermost point.
  const lineCoordinate = horizontal
    ? (direction < 0 ? Math.min(ay, by) : Math.max(ay, by)) + offset
    : (direction < 0 ? Math.min(ax, bx) : Math.max(ax, bx)) + offset;
  const start = horizontal ? { x: ax, y: lineCoordinate } : { x: lineCoordinate, y: ay };
  const end = horizontal ? { x: bx, y: lineCoordinate } : { x: lineCoordinate, y: by };

  const extension = (px: number, py: number, qx: number, qy: number) =>
    horizontal ? (
      <line
        x1={px}
        y1={py + direction * EXTENSION_GAP}
        x2={qx}
        y2={qy + direction * EXTENSION_OVERSHOOT}
        stroke="var(--accent)"
        strokeWidth="0.75"
      />
    ) : (
      <line
        x1={px + direction * EXTENSION_GAP}
        y1={py}
        x2={qx + direction * EXTENSION_OVERSHOOT}
        y2={qy}
        stroke="var(--accent)"
        strokeWidth="0.75"
      />
    );

  const textX = (start.x + end.x) / 2;
  const textY = (start.y + end.y) / 2;
  // Labels go on the outer side of the dimension line so they never cover geometry.
  const labelShift = direction < 0 ? -6 : 14;

  return (
    <g className="diagram-dimension">
      {extension(ax, ay, start.x, start.y)}
      {extension(bx, by, end.x, end.y)}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="var(--accent)"
        strokeWidth="1"
        markerStart={`url(#${arrowMarkerId})`}
        markerEnd={`url(#${arrowMarkerId})`}
      />
      {horizontal ? (
        <text x={textX} y={textY + labelShift} textAnchor="middle" className="diagram-mono">
          {label}
        </text>
      ) : (
        <text
          x={textX}
          y={textY}
          dy={labelShift}
          textAnchor="middle"
          transform={`rotate(-90 ${textX} ${textY})`}
          className="diagram-mono"
        >
          {label}
        </text>
      )}
    </g>
  );
}
