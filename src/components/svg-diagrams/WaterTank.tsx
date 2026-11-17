import { createDiagramScale, DiagramFrame, finiteOr } from "./DiagramFrame";

export interface WaterTankProps {
  /** Daily water allowance in litres (IS.010). */
  daily_liters?: number;
}

const SCENE_WIDTH = 6;
const SCENE_HEIGHT = 7;
const GROUND = 5;

/**
 * Schematic section of the storage required by IS.010: cistern at ground level
 * No se fijan proporciones sin el texto base sanitario.
 * The drawing is not to scale; the volumes come from the daily allowance.
 */
export function WaterTank({ daily_liters = 1500 }: WaterTankProps) {
  const daily = Math.max(0, finiteOr(daily_liters, 1500));
  const cistern = 0;
  const tank = 0;
  const scale = createDiagramScale(SCENE_WIDTH, SCENE_HEIGHT);
  const s = scale;
  const liters = (value: number): string => Math.round(value).toLocaleString("es-PE") + " L";

  return (
    <DiagramFrame
      widthMeters={SCENE_WIDTH}
      heightMeters={SCENE_HEIGHT}
      scale={scale}
      title="CISTERNA Y TANQUE ELEVADO"
      normReference="Esquema ilustrativo; almacenamiento fuera del PDF IS.010-2025"
      ariaLabel={`Esquema de almacenamiento de agua: dotación diaria ${liters(daily)}, capacidades de almacenamiento según proyecto`}
      notes={[
        `DOTACIÓN ${liters(daily)} POR DÍA · SIN ESCALA`,
        "CISTERNA: dimensionar con el texto íntegro de IS.010",
        "TANQUE: no calculado con la modificatoria residencial",
      ]}
    >
      {/* Ground line */}
      <line
        x1={0}
        y1={s(GROUND)}
        x2={s(SCENE_WIDTH)}
        y2={s(GROUND)}
        stroke="var(--text)"
        strokeWidth="2"
      />
      {/* Building */}
      <rect
        x={s(2.6)}
        y={s(1.6)}
        width={s(2.9)}
        height={s(GROUND - 1.6)}
        fill="var(--surface-2)"
        fillOpacity="0.4"
        stroke="var(--text)"
        strokeWidth="2"
      />
      <line
        x1={s(2.6)}
        y1={s(3.3)}
        x2={s(5.5)}
        y2={s(3.3)}
        stroke="var(--text)"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      {/* Elevated tank */}
      <rect
        x={s(3.9)}
        y={s(0.5)}
        width={s(1.3)}
        height={s(1.1)}
        fill="var(--accent)"
        fillOpacity="0.18"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <text x={s(4.55)} y={s(0.3)} textAnchor="middle" className="diagram-label-text">
        TANQUE ELEVADO
      </text>
      <text x={s(4.55)} y={s(1.15)} textAnchor="middle" className="diagram-label-text">
        {"Según proyecto"}
      </text>
      {/* Cistern below ground */}
      <rect
        x={s(0.3)}
        y={s(GROUND + 0.35)}
        width={s(2.1)}
        height={s(1.3)}
        fill="var(--accent)"
        fillOpacity="0.18"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <text x={s(1.35)} y={s(GROUND + 0.95)} textAnchor="middle" className="diagram-label-text">
        CISTERNA
      </text>
      <text x={s(1.35)} y={s(GROUND + 1.35)} textAnchor="middle" className="diagram-label-text">
        {"Según proyecto"}
      </text>
      {/* Riser from the cistern to the tank */}
      <path
        d={`M ${s(2.4)} ${s(GROUND + 0.9)} L ${s(3.0)} ${s(GROUND + 0.9)} L ${s(3.0)} ${s(1.0)} L ${s(3.9)} ${s(1.0)}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      <text x={s(0.3)} y={s(GROUND) - 8} className="diagram-label-text">
        NIVEL DE TERRENO
      </text>
    </DiagramFrame>
  );
}
