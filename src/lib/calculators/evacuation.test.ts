import { describe, expect, it } from "vitest";
import { computeEvacuationWidth } from "./evacuation";

describe("evacuation width", () => {
  it("uses the door factor", () => {
    const result = computeEvacuationWidth({ occupants: 300, element: "puerta" });
    expect(result.values.factor).toBe(0.005);
    expect(result.values.width).toBe(1.5);
  });

  it("uses the passage factor", () => {
    const result = computeEvacuationWidth({ occupants: 300, element: "pasadizo" });
    expect(result.values.width).toBe(1.5);
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
