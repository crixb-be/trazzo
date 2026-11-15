import { useDiagramContext } from "./DiagramFrame";

export interface DimensionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  offset?: number;
  orientation?: "horizontal" | "vertical";
  tone?: "default" | "highlight";
}

const EXTENSION_GAP = 3;
const EXTENSION_OVERSHOOT = 4;

export function Dimension({
  x1,
  y1,
  x2,
  y2,
  label,
  offset = 18,
  orientation,
  tone = "default",
}: DimensionProps) {
  const { scale, arrowMarkerId, highlightMarkerId } = useDiagramContext();
  const horizontal = orientation
    ? orientation === "horizontal"
    : Math.abs(y2 - y1) <= Math.abs(x2 - x1);
  const direction = offset < 0 ? -1 : 1;
  const stroke = tone === "highlight" ? "var(--highlight)" : "var(--accent)";
  const markerId = tone === "highlight" ? highlightMarkerId : arrowMarkerId;
  const ax = scale(x1);
  const ay = scale(y1);
  const bx = scale(x2);
  const by = scale(y2);
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
        stroke={stroke}
        strokeWidth="0.75"
      />
    ) : (
      <line
        x1={px + direction * EXTENSION_GAP}
        y1={py}
        x2={qx + direction * EXTENSION_OVERSHOOT}
        y2={qy}
        stroke={stroke}
        strokeWidth="0.75"
      />
    );
  const textX = (start.x + end.x) / 2;
  const textY = (start.y + end.y) / 2;
  const labelShift = direction < 0 ? -6 : 14;
  const labelClass = tone === "highlight" ? "diagram-mono diagram-highlight-label" : "diagram-mono";

  return (
    <g className="diagram-dimension">
      {extension(ax, ay, start.x, start.y)}
      {extension(bx, by, end.x, end.y)}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={tone === "highlight" ? 1.5 : 1}
        markerStart={`url(#${markerId})`}
        markerEnd={`url(#${markerId})`}
      />
      {horizontal ? (
        <text x={textX} y={textY + labelShift} textAnchor="middle" className={labelClass}>
          {label}
        </text>
      ) : (
        <text
          x={textX}
          y={textY}
          dy={labelShift}
          textAnchor="middle"
          transform={`rotate(-90 ${textX} ${textY})`}
          className={labelClass}
        >
          {label}
        </text>
      )}
    </g>
  );
}
