import { describe, expect, it } from "vitest";
import { fitWithin } from "./camera";

describe("photo sizing", () => {
  it("shrinks large pictures keeping their proportion", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it("never enlarges small pictures", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 0, 1280)).toEqual({ width: 0, height: 0 });
  });
});
