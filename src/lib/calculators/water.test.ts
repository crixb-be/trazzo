import { describe, expect, it } from "vitest";
import { officeDemand, residentialDemand, storage } from "./water";

describe("water demand", () => {
  it("calculates the warm-climate residential allowance", () => {
    expect(residentialDemand("calido", 4).values.dailyLiters).toBe(676);
  });

  it("calculates the three climate values from RM 0107-2025", () => {
    expect(residentialDemand("calido", 1).values.dailyLiters).toBe(169);
    expect(residentialDemand("templado", 1).values.dailyLiters).toBe(155);
    expect(residentialDemand("frio", 1).values.dailyLiters).toBe(129);
  });

  it("calculates office demand", () => {
    expect(officeDemand(100).values.dailyLiters).toBe(600);
  });

  it("keeps the tank minimum at 1,000 litres", () => {
    const result = storage(1500);
    expect(result.values.cisternLiters).toBe(1125);
    expect(result.values.tankLiters).toBe(1000);
  });

  it("warns on an invalid population", () => {
    expect(residentialDemand("templado", Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});
