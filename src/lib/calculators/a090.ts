import { A090_OCCUPANCY, type A090OccupancyUse } from "@/data/norms/a090";

/** Fixtures for one group: L = lavatorio, u = urinario, I = inodoro. */
export interface FixtureSet {
  lavatories: number;
  urinals: number;
  toilets: number;
}

export interface A090Fixtures {
  /** True for the 1–6 employee band, published as a single set of fixtures. */
  shared: boolean;
  men: FixtureSet;
  women: FixtureSet;
  /** Accessible fixtures required by Art. 16 (one per service with 3 or more fixtures). */
  accessible: number;
}

const ZERO: FixtureSet = { lavatories: 0, urinals: 0, toilets: 0 };
const set = (n: number): FixtureSet => ({ lavatories: n, urinals: n, toilets: n });
const womenSet = (n: number): FixtureSet => ({ lavatories: n, urinals: 0, toilets: n });

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}: ingresa un número entero no negativo.`);
  }
}

/**
 * Extra sets beyond the last band. The norm says "por cada 100 adicionales" without
 * mentioning fractions; a started hundred counts as one more set (conservative).
 */
function extraHundreds(count: number, lastBandTop: number): number {
  return count > lastBandTop ? Math.ceil((count - lastBandTop) / 100) : 0;
}

/** Art. 16: a service that needs 3 or more fixtures must include one accessible fixture. */
function accessibleFor(groups: FixtureSet[]): number {
  return groups.filter((g) => g.lavatories + g.urinals + g.toilets >= 3).length;
}

/** Art. 11: occupants for an area and use, rounded up. */
export function a090Occupancy(use: A090OccupancyUse, area: number): number {
  if (!Number.isFinite(area) || area < 0) throw new Error("Ingresa un área no negativa.");
  const row = A090_OCCUPANCY.find((item) => item.id === use);
  if (!row) throw new Error("Uso no encontrado en el Art. 11 de la A.090.");
  return Math.ceil(area / row.factor);
}

/** Art. 15, employees table. */
export function a090EmployeeFixtures(employees: number): A090Fixtures {
  assertCount(employees, "Empleados");
  if (employees === 0) return { shared: false, men: ZERO, women: ZERO, accessible: 0 };
  if (employees <= 6) {
    const shared = set(1);
    return { shared: true, men: shared, women: ZERO, accessible: accessibleFor([shared]) };
  }
  const base = employees <= 25 ? 1 : employees <= 75 ? 2 : 3;
  const n = base + extraHundreds(employees, 200);
  const men = set(n);
  const women = womenSet(n);
  return { shared: false, men, women, accessible: accessibleFor([men, women]) };
}

/** Art. 15, public table. */
export function a090PublicFixtures(people: number): A090Fixtures {
  assertCount(people, "Público");
  if (people === 0) return { shared: false, men: ZERO, women: ZERO, accessible: 0 };
  const base = people <= 100 ? 1 : 2;
  const n = base + extraHundreds(people, 200);
  const men = set(n);
  const women = womenSet(n);
  return { shared: false, men, women, accessible: accessibleFor([men, women]) };
}

/** Art. 17: accessible parking, 1 per 50 required spaces (a started 50 counts). */
export function a090AccessibleParking(requiredSpaces: number): number {
  assertCount(requiredSpaces, "Estacionamientos");
  return Math.ceil(requiredSpaces / 50);
}

export function formatFixtures(fixtures: FixtureSet, withUrinals = true): string {
  return [
    `${fixtures.lavatories}L`,
    ...(withUrinals ? [`${fixtures.urinals}u`] : []),
    `${fixtures.toilets}I`,
  ].join(", ");
}
