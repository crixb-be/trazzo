export type FixtureUse = "oficina" | "comercio" | "restaurante";
/** Tablas referenciales, por verificar; no incluyen dotaciones independientes para empleados ni accesibilidad. */
export const FIXTURE_TABLES: Record<FixtureUse, { max: number; count: number }[]> = {
  oficina: [
    { max: 6, count: 1 },
    { max: 20, count: 1 },
    { max: 60, count: 2 },
    { max: 150, count: 3 },
  ],
  comercio: [
    { max: 50, count: 1 },
    { max: 100, count: 2 },
    { max: 150, count: 3 },
  ],
  restaurante: [
    { max: 50, count: 1 },
    { max: 100, count: 2 },
    { max: 150, count: 3 },
  ],
};
export function computeFixtures(people: number, use: FixtureUse) {
  if (!Number.isSafeInteger(people) || people < 0)
    throw new Error("La población debe ser un entero no negativo.");
  if (people === 0) return { lavatories: 0, toilets: 0, urinals: 0 };
  const bands = FIXTURE_TABLES[use];
  const last = bands[bands.length - 1];
  const count =
    bands.find((b) => people <= b.max)?.count ??
    last.count + Math.ceil((people - last.max) / (use === "oficina" ? 60 : 100));
  return {
    lavatories: count,
    toilets: count,
    urinals: use === "oficina" && people <= 6 ? 0 : count,
  };
}
