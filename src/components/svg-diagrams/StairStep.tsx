import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface StairStepProps {
  risers?: number;
  riserHeight?: number;
  cp?: number;
  tread?: number;
  p?: number;
  width?: number;
}

const LANDING = 0.6;
const HANDRAIL_HEIGHT = 0.85;

/** Section of a straight flight with true step proportions and Blondel check. */
export function StairStep({ risers = 7, riserHeight, cp, tread, p, width = 0.9 }: StairStepProps) {
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

  // Step profile: riser up, tread across, repeated; the last riser reaches the upper floor.
  const profile: string[] = [`M 0 ${scale(base)}`, `L ${scale(start)} ${scale(base)}`];
  for (let index = 0; index < safeRisers; index += 1) {
    const x = start + index * safeTread;
    const y = base - (index + 1) * safeCp;
    profile.push(`L ${scale(x)} ${scale(y)}`);
    const nextX = index < safeRisers - 1 ? x + safeTread : end;
    profile.push(`L ${scale(nextX)} ${scale(y)}`);
  }
  profile.push(`L ${scale(end)} ${scale(base)} Z`);

  // Handrail parallel to the nosing line, with short horizontal extensions.
  const firstNosingY = base - safeCp;
  const railStartX = Math.max(0, start - 0.3);
  const railEndX = Math.min(end, flightEnd + 0.3);

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
      <path
        d={[
          `M ${scale(railStartX)} ${scale(firstNosingY - HANDRAIL_HEIGHT)}`,
          `L ${scale(start)} ${scale(firstNosingY - HANDRAIL_HEIGHT)}`,
          `L ${scale(flightEnd)} ${scale(top - HANDRAIL_HEIGHT)}`,
          `L ${scale(railEndX)} ${scale(top - HANDRAIL_HEIGHT)}`,
        ].join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <line
        x1={scale(start)}
        y1={scale(firstNosingY)}
        x2={scale(start)}
        y2={scale(firstNosingY - HANDRAIL_HEIGHT)}
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
        label={`${totalRise.toFixed(2)} m`}
        orientation="vertical"
      />
      <Dimension
        x1={start}
        y1={base}
        x2={start}
        y2={firstNosingY}
        label={`cp ${safeCp.toFixed(2)}`}
        offset={-18}
        orientation="vertical"
      />
    </DiagramFrame>
  );
}
