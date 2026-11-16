export interface CabidaInput {
  lotArea: number;
  frontage: number;
  coefficient: number;
  freePct: number;
  maxHeight: number;
  floorHeight: number;
  frontSetback: number;
  rearSetback: number;
  leftSetback: number;
  rightSetback: number;
  salePct: number;
}
export function computeCabida(p: CabidaInput) {
  if (
    Object.values(p).some((v) => !Number.isFinite(v) || v < 0) ||
    p.lotArea <= 0 ||
    p.frontage <= 0 ||
    p.floorHeight <= 0 ||
    p.freePct > 100 ||
    p.salePct > 100
  )
    throw new Error(
      "Área, frente y altura de piso deben ser positivos; porcentajes entre 0 y 100 y demás valores no negativos.",
    );
  const depth = p.lotArea / p.frontage;
  const setbackFootprint =
    Math.max(0, p.frontage - p.leftSetback - p.rightSetback) *
    Math.max(0, depth - p.frontSetback - p.rearSetback);
  const footprint = Math.min(setbackFootprint, p.lotArea * (1 - p.freePct / 100));
  const floors = Math.floor(p.maxHeight / p.floorHeight);
  const gross = Math.min(p.lotArea * p.coefficient, footprint * floors);
  const fullFloors = footprint > 0 ? Math.min(floors, Math.floor(gross / footprint)) : 0;
  const partialArea = Math.max(0, gross - fullFloors * footprint);
  return {
    depth,
    footprint,
    floors,
    gross,
    fullFloors,
    partialArea,
    saleable: (gross * p.salePct) / 100,
  };
}
