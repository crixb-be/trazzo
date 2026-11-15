import { createContext, useContext, useId, type ReactNode } from "react";

/** Converts metres into SVG px for one diagram instance. */
export type DiagramScale = (meters: number) => number;

/** Largest drawing area (px) the geometry may occupy inside the plate. */
const MAX_CONTENT_WIDTH = 480;
const MAX_CONTENT_HEIGHT = 340;
const MIN_PX_PER_METER = 2;
const MAX_PX_PER_METER = 160;
/** Fixed px room around the geometry for dimensions and labels. */
const PADDING = 40;
const HEADER_HEIGHT = 52;
const FOOTER_BASE_HEIGHT = 34;
const NOTE_LINE_HEIGHT = 16;
const MIN_VIEW_WIDTH = 360;
const SIDE_INSET = 16;

const SCALE_BAR_LENGTHS = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20];
const GRID_STEPS: ReadonlyArray<readonly [minor: number, major: number]> = [
  [0.1, 0.5],
  [0.2, 1],
  [0.5, 2.5],
  [1, 5],
  [2, 10],
  [5, 25],
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Returns `value` when it is a finite number, otherwise `fallback`. */
export function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Builds the metre→px conversion for a drawing of the given real size.
 * The px-per-metre ratio adapts so any geometry fits the same plate, while
 * text, strokes and markers stay in fixed px.
 */
export function createDiagramScale(widthMeters: number, heightMeters: number): DiagramScale {
  const pxPerMeter = clamp(
    Math.min(
      MAX_CONTENT_WIDTH / positive(widthMeters),
      MAX_CONTENT_HEIGHT / positive(heightMeters),
    ),
    MIN_PX_PER_METER,
    MAX_PX_PER_METER,
  );
  return (meters) => (Number.isFinite(meters) ? round(meters * pxPerMeter) : 0);
}

interface DiagramContextValue {
  scale: DiagramScale;
  arrowMarkerId: string;
  highlightMarkerId: string;
}

const DiagramContext = createContext<DiagramContextValue>({
  scale: createDiagramScale(1, 1),
  arrowMarkerId: "diagram-arrow",
  highlightMarkerId: "diagram-arrow-highlight",
});

/** Scale of the enclosing DiagramFrame (for annotation components). */
export function useDiagramScale(): DiagramScale {
  return useContext(DiagramContext).scale;
}

export function useDiagramContext(): DiagramContextValue {
  return useContext(DiagramContext);
}

function pickScaleBar(pxPerMeter: number): number {
  return SCALE_BAR_LENGTHS.find((length) => length * pxPerMeter >= 48) ?? 20;
}

function pickGrid(pxPerMeter: number): readonly [number, number] {
  return GRID_STEPS.find(([minor]) => minor * pxPerMeter >= 10) ?? [5, 25];
}

export interface DiagramFrameProps {
  /** Real size of the drawn geometry, in metres. */
  widthMeters: number;
  heightMeters: number;
  scale: DiagramScale;
  title: string;
  normReference: string;
  ariaLabel: string;
  /** Short technical notes rendered under the drawing. */
  notes?: string[];
  children: ReactNode;
}

/**
 * Technical plate shared by every RNE diagram: header, grid, geometry area,
 * scale bar and notes. Children draw in px using the same `scale` function.
 */
export function DiagramFrame({
  widthMeters,
  heightMeters,
  scale,
  title,
  normReference,
  ariaLabel,
  notes = [],
  children,
}: DiagramFrameProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const minorGridId = `diagram-grid-minor-${id}`;
  const majorGridId = `diagram-grid-major-${id}`;
  const arrowMarkerId = "diagram-arrow-" + id;
  const highlightMarkerId = "diagram-arrow-highlight-" + id;

  const pxPerMeter = scale(1) || 1;
  const contentWidth = scale(positive(widthMeters));
  const contentHeight = scale(positive(heightMeters));
  const viewWidth = round(Math.max(MIN_VIEW_WIDTH, contentWidth + PADDING * 2));
  const contentX = round((viewWidth - contentWidth) / 2);
  const contentY = HEADER_HEIGHT + PADDING;
  const footerHeight = FOOTER_BASE_HEIGHT + notes.length * NOTE_LINE_HEIGHT;
  const viewHeight = round(contentY + contentHeight + PADDING + footerHeight);

  const [minorStep, majorStep] = pickGrid(pxPerMeter);
  const minorPx = round(minorStep * pxPerMeter);
  const majorPx = round(majorStep * pxPerMeter);
  const scaleBarMeters = pickScaleBar(pxPerMeter);
  const scaleBarPx = round(scaleBarMeters * pxPerMeter);
  const scaleBarY = viewHeight - 18;
  const notesTop = contentY + contentHeight + PADDING + 6;

  return (
    <DiagramContext.Provider value={{ scale, arrowMarkerId, highlightMarkerId }}>
      <div className="diagram-frame">
        <svg
          className="diagram-svg"
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id={minorGridId}
              width={minorPx}
              height={minorPx}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${minorPx} 0 L 0 0 0 ${minorPx}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </pattern>
            <pattern
              id={majorGridId}
              width={majorPx}
              height={majorPx}
              patternUnits="userSpaceOnUse"
            >
              <rect width={majorPx} height={majorPx} fill={`url(#${minorGridId})`} />
              <path
                d={`M ${majorPx} 0 L 0 0 0 ${majorPx}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth="1"
              />
            </pattern>
            <marker
              id={arrowMarkerId}
              markerWidth="8"
              markerHeight="8"
              refX="8"
              refY="4"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
            </marker>
            <marker
              id={highlightMarkerId}
              markerWidth="8"
              markerHeight="8"
              refX="8"
              refY="4"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--highlight)" />
            </marker>
          </defs>

          <rect width={viewWidth} height={viewHeight} fill="var(--surface)" />
          <rect
            x={SIDE_INSET}
            y={HEADER_HEIGHT}
            width={viewWidth - SIDE_INSET * 2}
            height={contentHeight + PADDING * 2}
            fill={`url(#${majorGridId})`}
          />
          <line
            x1={SIDE_INSET}
            y1={HEADER_HEIGHT}
            x2={viewWidth - SIDE_INSET}
            y2={HEADER_HEIGHT}
            stroke="var(--border)"
            strokeWidth="1"
          />

          <text x={SIDE_INSET} y={24} className="diagram-title">
            {title}
          </text>
          <text x={SIDE_INSET} y={40} className="diagram-reference">
            {normReference}
          </text>

          <g transform={`translate(${contentX} ${contentY})`}>{children}</g>

          {notes.map((note, index) => (
            <text
              key={note}
              x={SIDE_INSET}
              y={notesTop + index * NOTE_LINE_HEIGHT}
              className="diagram-note"
            >
              {note}
            </text>
          ))}

          <g className="diagram-scale-bar" aria-hidden="true">
            <line
              x1={SIDE_INSET}
              y1={scaleBarY}
              x2={SIDE_INSET + scaleBarPx}
              y2={scaleBarY}
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <line
              x1={SIDE_INSET}
              y1={scaleBarY - 4}
              x2={SIDE_INSET}
              y2={scaleBarY + 4}
              stroke="var(--accent)"
              strokeWidth="1"
            />
            <line
              x1={SIDE_INSET + scaleBarPx}
              y1={scaleBarY - 4}
              x2={SIDE_INSET + scaleBarPx}
              y2={scaleBarY + 4}
              stroke="var(--accent)"
              strokeWidth="1"
            />
            <text x={SIDE_INSET + scaleBarPx + 8} y={scaleBarY + 4} className="diagram-mono">
              {scaleBarMeters.toFixed(2)} m
            </text>
          </g>
          <text
            x={viewWidth - SIDE_INSET}
            y={scaleBarY + 4}
            textAnchor="end"
            className="diagram-reference"
          >
            RNE
          </text>
        </svg>
      </div>
    </DiagramContext.Provider>
  );
}
