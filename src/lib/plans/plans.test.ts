import { describe, expect, it } from "vitest";
import {
  canCreateProject,
  canExportPdf,
  canUseAiQueries,
  canUseProCards,
  isEduPeEmail,
  isPlan,
  PLANS,
} from "./plans";

describe("plans", () => {
  it("defines the requested prices", () => {
    expect(PLANS.pro.pricePen).toBe(19.9);
    expect(PLANS.student.pricePen).toBe(9.95);
  });

  it("limits free projects", () => {
    expect(canCreateProject("free", 0)).toBe(true);
    expect(canCreateProject("free", 1)).toBe(false);
  });

  it("allows unlimited Pro projects", () => {
    expect(canCreateProject("pro", 1000)).toBe(true);
  });

  it("applies AI query limits", () => {
    expect(canUseAiQueries("free", 9)).toBe(true);
    expect(canUseAiQueries("free", 10)).toBe(false);
    expect(canUseAiQueries("pro", 100000)).toBe(true);
  });

  it("requires student verification for Pro cards", () => {
    expect(canUseProCards("student", false)).toBe(false);
    expect(canUseProCards("student", true)).toBe(true);
    expect(canUseProCards("pro")).toBe(true);
  });

  it("recognizes edu.pe addresses and plans", () => {
    expect(isEduPeEmail("alumna@uni.edu.pe")).toBe(true);
    expect(isEduPeEmail("alumna@gmail.com")).toBe(false);
    expect(isPlan("pro")).toBe(true);
    expect(isPlan("enterprise")).toBe(false);
  });

  it("gates PDF export", () => {
    expect(canExportPdf("free")).toBe(false);
    expect(canExportPdf("student")).toBe(true);
  });
});
