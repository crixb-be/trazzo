import { describe, expect, it } from "vitest";
import { multiFamilyDemand, officeDemand, singleFamilyDemand, storage } from "./water";

describe("water demand", () => {
  it("calculates the first single-family bracket", () => {
    expect(singleFamilyDemand(200).values.dailyLiters).toBe(1500);
  });

  it("calculates the 1,000 m² bracket", () => {
    expect(singleFamilyDemand(1000).values.dailyLiters).toBe(2600);
  });

  it("applies the additional area rule above 1,000 m²", () => {
    expect(singleFamilyDemand(1250).values.dailyLiters).toBe(2900);
  });

  it("calculates multifamily apartments by bedrooms", () => {
    const result = multiFamilyDemand([
      { bedrooms: 1, count: 2 },
      { bedrooms: 3, count: 1 },
    ]);
    expect(result.values.dailyLiters).toBe(2200);
  });

  it("calculates office demand", () => {
    expect(officeDemand(100).values.dailyLiters).toBe(600);
  });

  it("keeps the tank minimum at 1,000 litres", () => {
    const result = storage(1500);
    expect(result.values.cisternLiters).toBe(1125);
    expect(result.values.tankLiters).toBe(1000);
  });

  it("warns on an invalid lot area", () => {
    expect(singleFamilyDemand(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});
