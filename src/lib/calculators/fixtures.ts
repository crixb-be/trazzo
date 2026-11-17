export type FixtureUse = "oficina" | "comercio" | "restaurante";
export interface FixtureSet {
  lavatories: number;
  toilets: number;
  urinals: number;
}
/** A.080 art. 15 (empleados), A.070-2021 art.16.4 cuadros7/8 y 16.5 cuadros9/10. Población TOTAL, no por sexo. */
export function fixtureSchedule(
  total: number,
  use: FixtureUse,
  audience: "empleados" | "publico" = "empleados",
) {
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error("Población total entera no negativa requerida.");
  let bands: number[],
    counts: number[],
    increment: number,
    shared = 0;
  if (use === "oficina") {
    bands = [6, 20, 60, 150];
    counts = [1, 1, 2, 3];
    increment = 60;
    shared = 6;
  } else if (audience === "empleados") {
    bands = use === "restaurante" ? [5, 20, 60, 150] : [6, 25, 75, 200];
    counts = [1, 1, 2, 3];
    increment = use === "restaurante" ? 300 : 200;
    shared = bands[0];
  } else {
    bands = use === "restaurante" ? [16, 50, 100] : [20, 50, 200];
    counts = [0, 1, use === "restaurante" ? 2 : 1];
    increment = use === "restaurante" ? 200 : 400;
    shared = use === "comercio" ? 50 : 0;
  }
  const i = bands.findIndex((n) => total <= n);
  const count =
    total === 0
      ? 0
      : i >= 0
        ? counts[i]
        : counts.at(-1)! + Math.ceil((total - bands.at(-1)!) / increment);
  const make = (urinals: number): FixtureSet => ({ lavatories: count, toilets: count, urinals });
  const zero: FixtureSet = { lavatories: 0, toilets: 0, urinals: 0 };
  return total > 0 && total <= shared
    ? { mixed: make(count), men: zero, women: zero }
    : { mixed: zero, men: make(count), women: make(0) };
}
/** Compatibility API returns the male provision for the TOTAL population. */
export function computeFixtures(people: number, use: FixtureUse) {
  const r = fixtureSchedule(people, use);
  return r.mixed.toilets ? r.mixed : r.men;
}
