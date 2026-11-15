import type { ComponentType, ReactNode } from "react";
import type { RneCard, SvgType } from "@/data/seed-rne";
import { DoorClearance, type DoorClearanceProps } from "./DoorClearance";
import { LightWell, type LightWellProps } from "./LightWell";
import { ParkingStall, type ParkingStallProps } from "./ParkingStall";
import { RampSlope, type RampSlopeProps } from "./RampSlope";
import { StairStep, type StairStepProps } from "./StairStep";
import { WaterTank, type WaterTankProps } from "./WaterTank";
import { WheelchairTurn, type WheelchairTurnProps } from "./WheelchairTurn";

export type DiagramOverrides = Record<string, number | string>;

export type DiagramComponentProps =
  | DoorClearanceProps
  | LightWellProps
  | ParkingStallProps
  | RampSlopeProps
  | StairStepProps
  | WaterTankProps
  | WheelchairTurnProps;

export const diagramRegistry: Record<SvgType, ComponentType<DiagramComponentProps>> = {
  "door-clearance": DoorClearance as ComponentType<DiagramComponentProps>,
  "light-well": LightWell as ComponentType<DiagramComponentProps>,
  "parking-stall": ParkingStall as ComponentType<DiagramComponentProps>,
  "ramp-slope": RampSlope as ComponentType<DiagramComponentProps>,
  "stair-step": StairStep as ComponentType<DiagramComponentProps>,
  "water-tank": WaterTank as ComponentType<DiagramComponentProps>,
  "wheelchair-turn": WheelchairTurn as ComponentType<DiagramComponentProps>,
};

function componentProps(
  params: Record<string, number | string>,
  overrides?: DiagramOverrides,
): Record<string, number | string | boolean> {
  const merged = { ...params, ...overrides };
  const result: Record<string, number | string | boolean> = {};

  for (const [key, value] of Object.entries(merged)) {
    if (key === "showElevation") {
      result[key] = value === "true" || value === 1;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/** Renders the parametric diagram selected by a seed card. */
export function DiagramFor({
  type,
  params,
  overrides,
}: {
  type: SvgType;
  params: Record<string, number | string>;
  overrides?: DiagramOverrides;
}): ReactNode {
  const Component = diagramRegistry[type];
  return <Component {...componentProps(params, overrides)} />;
}

/** Card-aware helper used by normative detail pages and future exports. */
export function RneDiagram({
  card,
  overrides,
}: {
  card: RneCard;
  overrides?: DiagramOverrides;
}): ReactNode {
  return <DiagramFor type={card.svg_type} params={card.params} overrides={overrides} />;
}
