import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "ok" | "warn" | "danger" | "por-verificar" | "pro" | "norma";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  tone?: "neutral" | "ok" | "warn";
}

export function Badge({ children, variant, tone = "neutral" }: BadgeProps) {
  const resolvedVariant = variant ?? tone;
  return <span className={"badge badge-" + resolvedVariant}>{children}</span>;
}
