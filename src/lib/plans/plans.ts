export type Plan = "free" | "student" | "pro";

export interface PlanDefinition {
  label: string;
  price: number;
  pricePen: number;
  projects: number;
  aiQueries: number;
  pdfExport: boolean;
  proCards: boolean;
  requiresStudentVerification: boolean;
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    label: "Gratis",
    price: 0,
    pricePen: 0,
    projects: 1,
    aiQueries: 10,
    pdfExport: false,
    proCards: false,
    requiresStudentVerification: false,
  },
  student: {
    label: "Estudiante",
    price: 9.95,
    pricePen: 9.95,
    projects: Number.POSITIVE_INFINITY,
    aiQueries: 200,
    pdfExport: true,
    proCards: true,
    requiresStudentVerification: true,
  },
  pro: {
    label: "PRO",
    price: 19.9,
    pricePen: 19.9,
    projects: Number.POSITIVE_INFINITY,
    aiQueries: Number.POSITIVE_INFINITY,
    pdfExport: true,
    proCards: true,
    requiresStudentVerification: false,
  },
};

export function isPlan(value: string): value is Plan {
  return value === "free" || value === "student" || value === "pro";
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
