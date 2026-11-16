import { describe, expect, it } from "vitest";
import { computeLightWell } from "./lightwell";

describe("computeLightWell", () => {
  it("uses H/3 for habitable rooms", () => {
    expect(computeLightWell({ wallHeight: 9, kind: "habitable" }).values.minSide).toBe(3);
  });

  it("uses the 2.20 m habitable minimum", () => {
    expect(computeLightWell({ wallHeight: 4, kind: "habitable" }).values.minSide).toBe(2.2);
  });

  it("uses H/4 for services", () => {
    expect(computeLightWell({ wallHeight: 8, kind: "servicios" }).values.minSide).toBe(2);
  });

  it("uses the 1.80 m service minimum", () => {
    expect(computeLightWell({ wallHeight: 4, kind: "servicios" }).values.minSide).toBe(1.8);
  });

  it("fails a proposed side below the rule", () => {
    const result = computeLightWell({
      wallHeight: 9,
      kind: "habitable",
      proposedSide: 2.2,
    });
    expect(result.ok).toBe(false);
  });

  it("warns for invalid height", () => {
    const result = computeLightWell({ wallHeight: 0, kind: "habitable" });
    expect(result.ok).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
