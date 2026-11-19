import type { ReactNode } from "react";
import type { Family } from "@/lib/ui/families";

export type BadgeVariant = "neutral" | "ok" | "warn" | "danger" | "por-verificar" | "pro" | "norma";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  tone?: "neutral" | "ok" | "warn";
  /** Tints the pill with a colour family (see src/styles/families.css). */
  family?: Family;
}

export function Badge({ children, variant, tone = "neutral", family }: BadgeProps) {
  const resolvedVariant = variant ?? tone;
  return (
    <span className={"badge badge-" + resolvedVariant} data-family={family}>
      {children}
    </span>
  );
}
