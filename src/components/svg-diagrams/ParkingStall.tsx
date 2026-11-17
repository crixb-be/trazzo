import { useId } from "react";
import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";
import { Dimension } from "./Dimension";

export interface ParkingStallProps {
  width?: number;
  length?: number;
  transfer?: number;
}

/** Accessible parking stall plan with a hatched lateral transfer zone. */
export function ParkingStall({ width = 3.7, length = 5, transfer = 1.2 }: ParkingStallProps) {
  const hatchId = `parking-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const safeWidth = Math.max(2.4, finiteOr(width, 3.7));
  const safeLength = Math.max(4.5, finiteOr(length, 5));
  const safeTransfer = Math.max(0.9, finiteOr(transfer, 1.2));
  const stallWidth = safeWidth - safeTransfer > 2 ? safeWidth - safeTransfer : safeWidth;
  const transferIncluded = stallWidth !== safeWidth;
  const frameWidth = transferIncluded ? safeWidth : safeWidth + safeTransfer;
  const scale = createDiagramScale(frameWidth, safeLength);

  const symbolX = stallWidth / 2;
  const symbolY = safeLength * 0.55;
  const s = scale;

  return (
    <DiagramFrame
      widthMeters={frameWidth}
      heightMeters={safeLength}
      scale={scale}
      title="ESTACIONAMIENTO ACCESIBLE"
      normReference="A.120-2023 · art.23"
      ariaLabel={`Planta de estacionamiento accesible de ${safeWidth.toFixed(2)} × ${safeLength.toFixed(2)} m con zona de transferencia de ${safeTransfer.toFixed(2)} m`}
      notes={[
        `CAJÓN ${safeWidth.toFixed(2)} × ${safeLength.toFixed(2)} m`,
        `TRANSFERENCIA LATERAL ${safeTransfer.toFixed(2)} m (ACHURADO)`,
      ]}
    >
      <defs>
        <pattern
          id={hatchId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--accent)" strokeWidth="1.25" />
        </pattern>
      </defs>
      <rect
        x={0}
        y={0}
        width={s(frameWidth)}
        height={s(safeLength)}
        fill="var(--surface-2)"
        fillOpacity="0.4"
        stroke="var(--text)"
        strokeWidth="2"
      />
      <rect
        x={s(stallWidth)}
        y={0}
        width={s(frameWidth - stallWidth)}
        height={s(safeLength)}
        fill={`url(#${hatchId})`}
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      {/* International accessibility symbol, simplified */}
      <g stroke="var(--accent)" fill="none" strokeWidth="2" strokeLinecap="round">
        <rect
          x={s(symbolX - 0.5)}
          y={s(symbolY - 0.5)}
          width={s(1)}
          height={s(1)}
          rx="4"
          strokeWidth="1.5"
        />
        <circle cx={s(symbolX - 0.05)} cy={s(symbolY + 0.12)} r={s(0.22)} />
        <circle cx={s(symbolX - 0.02)} cy={s(symbolY - 0.33)} r={s(0.06)} fill="var(--accent)" />
        <path
          d={`M ${s(symbolX - 0.02)} ${s(symbolY - 0.22)} L ${s(symbolX - 0.02)} ${s(symbolY + 0.02)} L ${s(symbolX + 0.2)} ${s(symbolY + 0.02)} L ${s(symbolX + 0.28)} ${s(symbolY + 0.3)}`}
        />
      </g>
      <Dimension
        x1={0}
        y1={0}
        x2={stallWidth}
        y2={0}
        label={`${stallWidth.toFixed(2)} m`}
        offset={-18}
      />
      <Dimension
        x1={stallWidth}
        y1={0}
        x2={frameWidth}
        y2={0}
        label={`${(frameWidth - stallWidth).toFixed(2)}`}
        offset={-18}
      />
      <Dimension
        x1={0}
        y1={0}
        x2={0}
        y2={safeLength}
        label={`${safeLength.toFixed(2)} m`}
        offset={-18}
        orientation="vertical"
      />
    </DiagramFrame>
  );
}
