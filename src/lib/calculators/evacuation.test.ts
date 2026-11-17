import { describe, expect, it } from "vitest";
import { computeEvacuationWidth } from "./evacuation";

describe("evacuation width", () => {
  it("uses the door factor", () => {
    const result = computeEvacuationWidth({ occupants: 300, element: "puerta" });
    expect(result.values.factor).toBe(0.005);
    expect(result.values.width).toBeCloseTo(1.8);
  });

  it("uses the passage factor", () => {
    const result = computeEvacuationWidth({ occupants: 300, element: "pasadizo" });
    expect(result.values.width).toBeCloseTo(1.8);
  });

  it("uses the stair factor", () => {
    const result = computeEvacuationWidth({ occupants: 200, element: "escalera" });
    expect(result.values.factor).toBe(0.008);
    expect(result.values.width).toBe(1.6);
  });

  it("enforces the door minimum", () => {
    expect(computeEvacuationWidth({ occupants: 1, element: "puerta" }).values.width).toBe(1);
  });

  it("enforces the stair minimum", () => {
    expect(computeEvacuationWidth({ occupants: 1, element: "escalera" }).values.width).toBe(1.2);
  });

  it("warns on invalid occupants", () => {
    expect(computeEvacuationWidth({ occupants: -1, element: "puerta" }).ok).toBe(false);
  });
});

it("A.130 art.24 factores especiales y excepción de oficina", () => {
  expect(
    computeEvacuationWidth({ occupants: 100, element: "puerta", healthWithoutSprinklers: true })
      .values.width,
  ).toBeCloseTo(1.8);
  expect(
    computeEvacuationWidth({ occupants: 100, element: "escalera", healthWithoutSprinklers: true })
      .values.width,
  ).toBe(1.5);
  expect(
    computeEvacuationWidth({ occupants: 49, element: "pasadizo", officePassage: true }).values
      .width,
  ).toBe(0.9);
  expect(
    computeEvacuationWidth({ occupants: 50, element: "pasadizo", officePassage: true }).values
      .width,
  ).toBe(1.2);
});
