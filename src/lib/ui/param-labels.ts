export interface ParamMeta {
  label: string;
  unit: string;
}

/** Readable name and unit for each editable diagram parameter of the RNE cards. */
const PARAMS: Record<string, ParamMeta> = {
  cp: { label: "Contrapaso (cp)", unit: "m" },
  p: { label: "Paso (p)", unit: "m" },
  risers: { label: "Contrapasos", unit: "und" },
  max_risers: { label: "Máx. contrapasos por tramo", unit: "und" },
  diameter: { label: "Diámetro de giro", unit: "m" },
  door_factor: { label: "Factor de puerta", unit: "m/pers." },
  stair_factor: { label: "Factor de escalera", unit: "m/pers." },
  occupants: { label: "Ocupantes", unit: "pers." },
  height: { label: "Altura", unit: "m" },
  width: { label: "Ancho", unit: "m" },
  length: { label: "Largo", unit: "m" },
  side: { label: "Lado", unit: "m" },
  rise: { label: "Desnivel", unit: "m" },
  slope: { label: "Pendiente (0.12 = 12 %)", unit: "" },
  landing: { label: "Descanso", unit: "m" },
  transfer: { label: "Zona de transferencia", unit: "m" },
  lot_area: { label: "Área de lote", unit: "m²" },
  daily_liters: { label: "Dotación diaria", unit: "L/d" },
  bedrooms: { label: "Dormitorios", unit: "und" },
  units: { label: "Departamentos", unit: "und" },
  without_sprinklers: { label: "Recorrido sin rociadores", unit: "m" },
  with_sprinklers: { label: "Recorrido con rociadores", unit: "m" },
};

export function paramMeta(name: string): ParamMeta {
  return PARAMS[name] ?? { label: name.replaceAll("_", " "), unit: "" };
}
