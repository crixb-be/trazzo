export type Plan = "free" | "student" | "pro";
export type BillingCycle = "monthly" | "annual";

export interface PlanDefinition {
  label: string;
  prices: Record<BillingCycle, number>;
  projects: number;
  aiQueries: number;
  pdfExport: boolean;
  proCards: boolean;
  requiresStudentVerification: boolean;
  proposalPdf: boolean;
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    label: "Gratis",
    prices: { monthly: 0, annual: 0 },
    projects: 1,
    aiQueries: 10,
    pdfExport: false,
    proCards: false,
    requiresStudentVerification: false,
    proposalPdf: false,
  },
  student: {
    label: "Estudiante",
    prices: { monthly: 7.99, annual: 60 },
    projects: Number.POSITIVE_INFINITY,
    aiQueries: 200,
    pdfExport: true,
    proCards: true,
    requiresStudentVerification: true,
    proposalPdf: true,
  },
  pro: {
    label: "PRO",
    prices: { monthly: 14.99, annual: 109 },
    projects: Number.POSITIVE_INFINITY,
    aiQueries: Number.POSITIVE_INFINITY,
    pdfExport: true,
    proCards: true,
    requiresStudentVerification: false,
    proposalPdf: true,
  },
};

export function planPrice(plan: Plan, cycle: BillingCycle): number {
  return PLANS[plan].prices[cycle];
}

export function annualSavingsPct(plan: Plan): number {
  const monthly = PLANS[plan].prices.monthly;
  const annual = PLANS[plan].prices.annual;
  if (monthly === 0) return 0;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

export function monthlyEquivalent(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual"
    ? Math.round((planPrice(plan, cycle) / 12) * 100) / 100
    : planPrice(plan, cycle);
}

export function subscriptionDays(cycle: BillingCycle): number {
  return cycle === "annual" ? 365 : 30;
}

export function isBillingCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export function canExportCleanProposal(plan: Plan): boolean {
  return PLANS[plan].proposalPdf;
}

export function formatPlanPrice(plan: Plan, cycle: BillingCycle): string {
  const price = planPrice(plan, cycle);
  return price === 0
    ? "Gratis"
    : "S/ " + price.toFixed(2) + (cycle === "annual" ? " / año" : " / mes");
}

export function isPlan(value: string): value is Plan {
  return value === "free" || value === "student" || value === "pro";
}

export interface PlanProfileRow {
  plan?: unknown;
  student_verified?: unknown;
  subscription_expires_at?: unknown;
}

/**
 * The plan a profile row is actually entitled to right now: an unverified
 * student or an expired subscription counts as Gratis. A paid plan with no
 * expiry date (granted by hand) does not expire.
 */
export function resolveEffectivePlan(
  row: PlanProfileRow | null | undefined,
  now: Date = new Date(),
): Plan {
  const stored = typeof row?.plan === "string" && isPlan(row.plan) ? row.plan : "free";
  if (stored === "free") return "free";
  if (stored === "student" && row?.student_verified !== true) return "free";
  const expires =
    typeof row?.subscription_expires_at === "string"
      ? Date.parse(row.subscription_expires_at)
      : Number.NaN;
  if (Number.isFinite(expires) && expires <= now.getTime()) return "free";
  return stored;
}

export function canUseProCards(plan: Plan, studentVerified = true): boolean {
  return plan === "pro" || (plan === "student" && studentVerified);
}

export function canCreateProject(plan: Plan, currentProjects: number): boolean {
  return currentProjects < PLANS[plan].projects;
}

export function canUseAiQueries(plan: Plan, usedQueries: number): boolean {
  return usedQueries < PLANS[plan].aiQueries;
}

export function canExportPdf(plan: Plan): boolean {
  return PLANS[plan].pdfExport;
}

export function isEduPeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.edu\.pe$/i.test(email.trim());
}

export const PLAN_LIMITS = PLANS;
