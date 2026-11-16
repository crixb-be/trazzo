import type { MaterialInput, MaterialMode } from "@/data/rendimientos";
export interface MaterialQuantity {
  code: string;
  quantity: number;
}
export function computeMaterials(mode: MaterialMode, p: MaterialInput): MaterialQuantity[] {
  if (Object.values(p).some((n) => !Number.isFinite(n) || n < 0))
    throw new Error("Usa valores finitos y no negativos.");
  const factor = 1 + p.waste / 100;
  const lines: MaterialQuantity[] = [];
  const add = (code: string, quantity: number, whole = false) => {
    const value = quantity * factor;
    if (!Number.isFinite(value)) throw new Error("Cantidad fuera de rango.");
    lines.push({ code, quantity: whole ? Math.ceil(value) : value });
  };
  const concrete = (volume: number) => {
    add("cemento-portland-tipo-i", volume * p.bags, true);
    add("arena-gruesa", volume * p.sand);
    add("piedra-chancada-1-2", volume * p.stone);
  };
  if (mode === "concreto") concrete(p.volume);
  if (mode === "losa") {
    concrete(p.area * p.concretePerM2);
    add("ladrillo-techo-15", p.area * p.roofBricks, true);
  }
  if (mode === "muro") {
    if (Math.min(p.brickLength, p.brickWidth, p.brickHeight) <= 0)
      throw new Error("Las dimensiones del ladrillo deben ser mayores que cero.");
    const faces = [
      [p.brickLength, p.brickHeight, p.brickWidth],
      [p.brickWidth, p.brickHeight, p.brickLength],
      [p.brickLength, p.brickWidth, p.brickHeight],
    ];
    const face = faces[p.bond];
    if (!face) throw new Error("Aparejo inválido.");
    const count = p.area / ((face[0] + p.joint) * (face[1] + p.joint));
    add("ladrillo-king-kong-18", count, true);
    const mortar =
      Math.max(0, p.area * face[2] - count * p.brickLength * p.brickWidth * p.brickHeight) *
      p.dryFactor;
    add("cemento-portland-tipo-i", ((mortar / (1 + p.mortarRatio)) * 1440) / 42.5, true);
    add("arena-gruesa", (mortar * p.mortarRatio) / (1 + p.mortarRatio));
  }
  if (mode === "tarrajeo" || mode === "contrapiso") {
    const dry = p.area * p.thickness * p.dryFactor;
    add("cemento-portland-tipo-i", ((dry / (1 + p.mortarRatio)) * 1440) / 42.5, true);
    add(
      mode === "tarrajeo" ? "arena-fina" : "arena-gruesa",
      (dry * p.mortarRatio) / (1 + p.mortarRatio),
    );
  }
  if (mode === "ceramico" || mode === "porcelanato") {
    if (Math.min(p.tileLength, p.tileWidth, p.bagKg) <= 0)
      throw new Error("La pieza y la bolsa deben tener tamaño positivo.");
    const pieces = Math.ceil((p.area * factor) / (p.tileLength * p.tileWidth));
    // El catálogo se mide en m²; redondear a piezas completas antes de enviar.
    lines.push({
      code: mode === "ceramico" ? "ceramico-piso-45" : "porcelanato-60",
      quantity: pieces * p.tileLength * p.tileWidth,
    });
    add("pegamento-ceramico", (p.area * p.adhesive) / p.bagKg, true);
  }
  if (mode === "pintura") {
    if (p.coverage <= 0) throw new Error("El rendimiento debe ser positivo.");
    add("pintura-latex", (p.area * p.coats) / p.coverage);
  }
  if (mode === "acero") {
    if (p.diameter <= 0 || p.barLength <= 0)
      throw new Error("Diámetro y longitud deben ser positivos.");
    const kgBar = (p.diameter ** 2 / 162) * p.barLength;
    add(
      p.diameter < 11 ? "acero-3-8" : p.diameter < 14 ? "acero-1-2" : "acero-5-8",
      p.steelDirection === 0 ? p.steelQuantity / kgBar : p.steelQuantity,
      true,
    );
  }
  return lines;
}
export function steelKg(diameter: number, length: number, bars: number) {
  return (diameter ** 2 / 162) * length * bars;
}
