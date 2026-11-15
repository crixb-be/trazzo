import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface StairStepProps {
  risers?: number;
  riserHeight?: number;
  cp?: number;
  tread?: number;
  p?: number;
  width?: number;
  highlight?: "height" | "width" | "tread" | "";
}

const LANDING = 0.6;
const HANDRAIL_HEIGHT = 0.85;

export function StairStep({
  risers = 7,
  riserHeight,
  cp,
  tread,
  p,
  width = 0.9,
  highlight = "",
}: StairStepProps) {
  const safeRisers = Math.round(Math.min(40, Math.max(2, finiteOr(risers, 7))));
  const safeCp = Math.max(0.05, finiteOr(riserHeight ?? cp, 0.17));
  const safeTread = Math.max(0.2, finiteOr(tread ?? p, 0.29));
  const safeWidth = Math.max(0.6, finiteOr(width, 0.9));
  const blondel = 2 * safeCp + safeTread;
  const totalRise = safeRisers * safeCp;
  const flightRun = (safeRisers - 1) * safeTread;
  const frameWidth = LANDING * 2 + flightRun;
  const frameHeight = totalRise + HANDRAIL_HEIGHT + 0.1;
  const scale = createDiagramScale(frameWidth, frameHeight);
  const base = frameHeight;
  const start = LANDING;
  const flightEnd = start + flightRun;
  const end = frameWidth;
  const top = base - totalRise;
  const profile: string[] = [`M 0 ${scale(base)}`, `L ${scale(start)} ${scale(base)}`];

  for (let index = 0; index < safeRisers; index += 1) {
    const x = start + index * safeTread;
    const y = base - (index + 1) * safeCp;
    profile.push(`L ${scale(x)} ${scale(y)}`);
    profile.push(`L ${scale(index < safeRisers - 1 ? x + safeTread : end)} ${scale(y)}`);
  }
  profile.push(`L ${scale(end)} ${scale(base)} Z`);

  const insetWidth = 140 / (scale(1) || 1);
  const insetHeight = 64 / (scale(1) || 1);
  const insetTone = highlight === "width" ? "var(--highlight)" : "var(--muted)";

  return (
    <DiagramFrame
      widthMeters={frameWidth}
      heightMeters={frameHeight}
      scale={scale}
      title="ESCALERA / 2cp+p"
      normReference="A.010 · Cap. VI"
      ariaLabel={`Sección de escalera con ${safeRisers} contrapasos de ${safeCp.toFixed(3)} m y pasos de ${safeTread.toFixed(2)} m`}
      notes={[
        `${safeRisers} CONTRAPASOS · ANCHO ${safeWidth.toFixed(2)} m`,
        `cp ${safeCp.toFixed(3)} · p ${safeTread.toFixed(2)} · 2cp+p = ${blondel.toFixed(3)} m`,
      ]}
    >
      <path
        d={profile.join(" ")}
        fill="var(--accent)"
        fillOpacity="0.12"
        stroke="var(--text)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {highlight === "height" &&
        Array.from({ length: safeRisers }, (_, index) => {
          const x = start + index * safeTread;
          const y = base - index * safeCp;
          return (
            <line
              key={index}
              x1={scale(x)}
              y1={scale(y)}
              x2={scale(x)}
              y2={scale(y - safeCp)}
              stroke="var(--highlight)"
              strokeWidth="2.5"
            />
          );
        })}
      <path
        d={[
          `M ${scale(Math.max(0, start - 0.3))} ${scale(base - safeCp - HANDRAIL_HEIGHT)}`,
          `L ${scale(start)} ${scale(base - safeCp - HANDRAIL_HEIGHT)}`,
          `L ${scale(flightEnd)} ${scale(top - HANDRAIL_HEIGHT)}`,
          `L ${scale(Math.min(end, flightEnd + 0.3))} ${scale(top - HANDRAIL_HEIGHT)}`,
        ].join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <line
        x1={scale(start)}
        y1={scale(base - safeCp)}
        x2={scale(start)}
        y2={scale(base - safeCp - HANDRAIL_HEIGHT)}
        stroke="var(--text)"
        strokeWidth="1"
      />
      <line
        x1={scale(flightEnd)}
        y1={scale(top)}
        x2={scale(flightEnd)}
        y2={scale(top - HANDRAIL_HEIGHT)}
        stroke="var(--text)"
        strokeWidth="1"
      />
      <Dimension
        x1={start}
        y1={base}
        x2={flightEnd}
        y2={base}
        label={`${safeRisers - 1} × ${safeTread.toFixed(2)} = ${flightRun.toFixed(2)} m`}
      />
      <Dimension
        x1={end}
        y1={base}
        x2={end}
        y2={top}
        label={
          highlight === "height"
            ? `Altura piso a piso = ${totalRise.toFixed(2)} m`
            : `${totalRise.toFixed(2)} m`
        }
        orientation="vertical"
        tone={highlight === "height" ? "highlight" : "default"}
      />
      <Dimension
        x1={start}
        y1={base}
        x2={start}
        y2={base - safeCp}
        label={
          highlight === "height"
            ? `Contrapaso (cp) = ${safeCp.toFixed(3)} m`
            : `cp ${safeCp.toFixed(2)}`
        }
        offset={-18}
        orientation="vertical"
        tone={highlight === "height" ? "highlight" : "default"}
      />
      {highlight === "tread" && (
        <Dimension
          x1={start + safeTread}
          y1={base - safeCp}
          x2={start + 2 * safeTread}
          y2={base - safeCp}
          label={`Paso (p) = ${safeTread.toFixed(2)} m`}
          offset={-18}
          tone="highlight"
        />
      )}
      <g transform={`translate(6 6)`}>
        <rect
          width={scale(insetWidth)}
          height={scale(insetHeight)}
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="6" y="13" className="diagram-reference">
          PLANTA
        </text>
        <line
          x1="10"
          y1="24"
          x2={scale(insetWidth) - 10}
          y2="24"
          stroke={insetTone}
          strokeWidth="1.5"
        />
        <line
          x1="10"
          y1={scale(insetHeight) - 14}
          x2={scale(insetWidth) - 10}
          y2={scale(insetHeight) - 14}
          stroke={insetTone}
          strokeWidth="1.5"
        />
        {[0, 1, 2, 3].map((index) => (
          <line
            key={index}
            x1={22 + index * 20}
            y1="28"
            x2={22 + index * 20}
            y2={scale(insetHeight) - 18}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        <Dimension
          x1={insetWidth - 0.12}
          y1={0.12}
          x2={insetWidth - 0.12}
          y2={insetHeight - 0.12}
          label=""
          orientation="vertical"
          tone={highlight === "width" ? "highlight" : "default"}
          offset={-10}
        />
        {/* Horizontal label under the inset: a rotated one overflowed the small box. */}
        <text
          x="0"
          y={scale(insetHeight) + 14}
          className={
            highlight === "width" ? "diagram-mono diagram-highlight-label" : "diagram-mono"
          }
        >
          {`Ancho libre = ${safeWidth.toFixed(2)} m`}
        </text>
      </g>
    </DiagramFrame>
  );
}
