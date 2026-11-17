import { describe, expect, it } from "vitest";
import { detectNativePlatform } from "./platform";

describe("native platform detection", () => {
  it("keeps checkout available on web/PWA", () => {
    expect(detectNativePlatform({ isNativePlatform: () => false })).toBe(false);
  });

  it("identifies the Capacitor shell as native", () => {
    expect(detectNativePlatform({ isNativePlatform: () => true })).toBe(true);
  });
});

