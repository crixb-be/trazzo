import { invalidResult, type CalcResult } from "./types";
export type Climate = "calido" | "templado" | "frio";
export const CLIMATE_DEMAND: Record<Climate, number> = { calido: 169, templado: 155, frio: 129 };
export type WaterKind = "unifamiliar" | "multifamiliar" | "oficina";
export interface WaterValues {
  dailyLiters: number;
  dailyM3: number;
  cisternLiters: number;
  cisternM3: number;
  tankLiters: number;
  tankM3: number;
  people: number;
}
export interface ApartmentDemand {
  bedrooms: number;
  count: number;
}
const zero: WaterValues = {
  dailyLiters: 0,
  dailyM3: 0,
  cisternLiters: 0,
  cisternM3: 0,
  tankLiters: 0,
  tankM3: 0,
  people: 0,
};
export function housingPeople(bedrooms: number, multifamily = true) {
  if (!Number.isSafeInteger(bedrooms) || bedrooms < 1 || (!multifamily && bedrooms > 3))
    throw new Error(
      "A.020 art. 7: 1/2/3 dormitorios → 2/3/4 personas. El incremento por dormitorio adicional está indicado para multifamiliar; para otros casos sustenta población específica.",
    );
  return bedrooms + 1;
}
export function residentialDemand(people: number, climate: Climate): CalcResult<WaterValues> {
  if (!Number.isSafeInteger(people) || people <= 0 || !Object.hasOwn(CLIMATE_DEMAND, climate))
    return invalidResult(zero, "Indica población entera positiva y clima SENAMHI.");
  const dailyLiters = people * CLIMATE_DEMAND[climate];
  return {
    ok: true,
    values: { ...zero, people, dailyLiters, dailyM3: dailyLiters / 1000 },
    checks: [],
    warnings: [
      "RM 0107-2025-VIVIENDA: IS.010 2.2.a. Clima según mapa SENAMHI; semifrígido, frígido y glaciar se consideran frío. Población según A.020 art. 7.",
      "La modificatoria suministrada no contiene reglas de almacenamiento ni dotaciones no residenciales: no se dimensionan cisterna/tanque ni oficinas aquí.",
      "Revisa la disposición transitoria para proyectos en trámite previos a la modificatoria.",
    ],
  };
}
export function singleFamilyDemand(bedrooms: number, climate: Climate = "templado") {
  try {
    return residentialDemand(housingPeople(bedrooms, false), climate);
  } catch (e) {
    return invalidResult(zero, (e as Error).message);
  }
}
export function multiFamilyDemand(units: ApartmentDemand[], climate: Climate = "templado") {
  try {
    if (!units.length) throw new Error("Agrega viviendas.");
    let people = 0;
    for (const u of units) {
      if (!Number.isSafeInteger(u.count) || u.count <= 0)
        throw new Error("La cantidad de viviendas debe ser entera positiva.");
      people += housingPeople(u.bedrooms) * u.count;
    }
    return residentialDemand(people, climate);
  } catch (e) {
    return invalidResult(zero, (e as Error).message);
  }
}
/** A.080 art.17:20 L/persona/día; riego de jardines5 L/m²/día. No se reutiliza el antiguo6 L/m². */
export function officeDemand(people: number, gardenArea = 0): CalcResult<WaterValues> {
  if (
    !Number.isSafeInteger(people) ||
    people <= 0 ||
    !Number.isFinite(gardenArea) ||
    gardenArea < 0
  )
    return invalidResult(
      zero,
      "Empleados enteros positivos y área de jardín no negativa requeridos.",
    );
  const dailyLiters = 20 * people + 5 * gardenArea;
  return {
    ok: true,
    values: { ...zero, people, dailyLiters, dailyM3: dailyLiters / 1000 },
    checks: [],
    warnings: [
      "A.080 art.17 del PDF aportado:oficinas20 L/persona/día; jardines5 L/m²/día. Esta tabla no es la modificatoria residencial por clima.",
      "No se dimensionan volúmenes de cisterna ni tanque sin contraste del texto base sanitario y su régimen aplicable.",
    ],
  };
}

export type StorageValues = Pick<
  WaterValues,
  "cisternLiters" | "cisternM3" | "tankLiters" | "tankM3"
>;
export function storage(_daily: number): CalcResult<StorageValues> {
  return invalidResult(
    zero,
    "Almacenamiento fuera del alcance del PDF suministrado; requiere el texto base de IS.010.",
  );
}
export function calculateWater(kind: WaterKind, input: number, bedrooms = 1) {
  return kind === "oficina"
    ? officeDemand(input)
    : kind === "unifamiliar"
      ? singleFamilyDemand(input)
      : multiFamilyDemand([{ bedrooms, count: input }]);
}
export { RNE_WARNING } from "./types";
