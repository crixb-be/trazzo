import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOOL_IDS,
  detectPlatform,
  MAX_FAVORITE_TOOLS,
  parseOnboarding,
  QUICK_TOOLS,
  resolveTools,
  suggestedTools,
  toggleTool,
} from "./onboarding";

describe("onboarding", () => {
  it("suggests existing tools for each role", () => {
    const known = new Set(QUICK_TOOLS.map((tool) => tool.id));
    for (const role of ["estudiante", "profesional"] as const) {
      const tools = suggestedTools(role);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((id) => known.has(id))).toBe(true);
    }
    expect(suggestedTools("profesional")).toContain("honorarios");
    expect(suggestedTools("estudiante")).toContain("medidas");
  });

  it("toggles tools and respects the limit", () => {
    expect(toggleTool(["rampas"], "agua")).toEqual(["rampas", "agua"]);
    expect(toggleTool(["rampas", "agua"], "rampas")).toEqual(["agua"]);
    const full = QUICK_TOOLS.slice(0, MAX_FAVORITE_TOOLS).map((tool) => tool.id);
    expect(toggleTool(full, "metrados")).toEqual(full);
  });

  it("keeps the chosen order and falls back to the defaults", () => {
    expect(resolveTools(["honorarios", "nope", "rampas"]).map((tool) => tool.id)).toEqual([
      "honorarios",
      "rampas",
    ]);
    expect(resolveTools([]).map((tool) => tool.id)).toEqual(DEFAULT_TOOL_IDS);
  });

  it("reads stored state defensively", () => {
    expect(parseOnboarding(null)).toEqual({ done: false, role: null, tools: [] });
    expect(parseOnboarding("{oops")).toEqual({ done: false, role: null, tools: [] });
    expect(
      parseOnboarding(JSON.stringify({ done: true, role: "jefe", tools: ["rampas", 3, "x"] })),
    ).toEqual({ done: true, role: null, tools: ["rampas"] });
  });

  it("detects the install platform", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("escritorio");
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 7)")).toBe("android");
  });
});
