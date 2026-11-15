"use client";

import { annualSavingsPct, type BillingCycle } from "@/lib/plans/plans";

export interface BillingToggleProps {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  const maxSavings = Math.max(annualSavingsPct("student"), annualSavingsPct("pro"));
  return (
    <div className="billing-toggle" role="radiogroup" aria-label="Ciclo de facturación">
      <button
        className={value === "monthly" ? "active" : ""}
        type="button"
        role="radio"
        aria-checked={value === "monthly"}
        onClick={() => onChange("monthly")}
      >
        Mensual
      </button>
      <button
        className={value === "annual" ? "active" : ""}
        type="button"
        role="radio"
        aria-checked={value === "annual"}
        onClick={() => onChange("annual")}
      >
        Anual <span className="billing-savings">Ahorra hasta {maxSavings}%</span>
      </button>
    </div>
  );
}
