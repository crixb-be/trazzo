import { describe, expect, it } from "vitest";
import {
  canCreateProject,
  canExportPdf,
  canUseAiQueries,
  canUseProCards,
  isEduPeEmail,
  isPlan,
  PLANS,
  annualSavingsPct,
  formatPlanPrice,
  monthlyEquivalent,
  subscriptionDays,
  resolveEffectivePlan,
  nextExpiry,
  queriesUsedToday,
  usageDay,
} from "./plans";

describe("plans", () => {
  it("defines the requested prices", () => {
    expect(PLANS.pro.prices).toEqual({ monthly: 14.99, annual: 109 });
    expect(PLANS.student.prices).toEqual({ monthly: 7.99, annual: 60 });
    expect(annualSavingsPct("student")).toBe(37);
    expect(annualSavingsPct("pro")).toBe(39);
    expect(monthlyEquivalent("pro", "annual")).toBe(9.08);
    expect(subscriptionDays("monthly")).toBe(30);
    expect(subscriptionDays("annual")).toBe(365);
    expect(formatPlanPrice("student", "monthly")).toBe("S/ 7.99 / mes");
    expect(formatPlanPrice("student", "annual")).toBe("S/ 60.00 / a\u00f1o");
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

  it("resolves the plan a profile is entitled to", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const future = "2026-07-01T00:00:00Z";
    const past = "2026-06-01T00:00:00Z";
    expect(resolveEffectivePlan(null, now)).toBe("free");
    expect(resolveEffectivePlan({ plan: "pro", subscription_expires_at: future }, now)).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", subscription_expires_at: past }, now)).toBe("free");
    expect(resolveEffectivePlan({ plan: "pro", subscription_expires_at: null }, now)).toBe("pro");
    expect(
      resolveEffectivePlan(
        { plan: "student", student_verified: false, subscription_expires_at: future },
        now,
      ),
    ).toBe("free");
    expect(
      resolveEffectivePlan(
        { plan: "student", student_verified: true, subscription_expires_at: future },
        now,
      ),
    ).toBe("student");
    expect(resolveEffectivePlan({ plan: "enterprise" }, now)).toBe("free");
  });

  it("counts assistant usage per day in Lima time", () => {
    // 03:00 UTC is still the previous day in Lima (UTC-5).
    expect(usageDay(new Date("2026-06-16T03:00:00Z"))).toBe("2026-06-15");
    const now = new Date("2026-06-15T18:00:00Z");
    expect(queriesUsedToday({ ai_queries_used: 7, ai_queries_day: "2026-06-15" }, now)).toBe(7);
    expect(queriesUsedToday({ ai_queries_used: 7, ai_queries_day: "2026-06-14" }, now)).toBe(0);
    expect(queriesUsedToday({ ai_queries_used: 7, ai_queries_day: null }, now)).toBe(0);
    expect(queriesUsedToday(null, now)).toBe(0);
  });

  it("extends a subscription from its current end when renewed early", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    expect(nextExpiry(null, "monthly", now)).toBe("2026-07-15T00:00:00.000Z");
    expect(nextExpiry("2026-06-01T00:00:00Z", "monthly", now)).toBe("2026-07-15T00:00:00.000Z");
    expect(nextExpiry("2026-06-25T00:00:00Z", "monthly", now)).toBe("2026-07-25T00:00:00.000Z");
    expect(nextExpiry("2026-06-25T00:00:00Z", "annual", now)).toBe("2027-06-25T00:00:00.000Z");
  });
});
