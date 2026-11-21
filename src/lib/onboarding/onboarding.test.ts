import { describe, expect, it } from "vitest";
import { detectPlatform, parseOnboarding } from "./onboarding";

describe("onboarding", () => {
  it("accepts old preferences and reads the completion flag defensively", () => {
    expect(parseOnboarding(null)).toEqual({ done: false });
    expect(parseOnboarding("{oops")).toEqual({ done: false });
    expect(parseOnboarding("null")).toEqual({ done: false });
    expect(
      parseOnboarding('{"done": true, "role": "profesional", "tools": ["rampas", 3]}'),
    ).toEqual({ done: true });
  });

  it("detects the install platform", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("escritorio");
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 7)")).toBe("android");
  });
});
