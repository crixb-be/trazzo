"use client";

import { Lock } from "lucide-react";
import { Button, Card, PaywallModal } from "@/components/ui";
import { useState } from "react";
import { computeEvacuationWidth } from "@/lib/calculators/evacuation";
import { canUseProCards } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { CalculatorResult } from "./CalculatorResult";

export function EvacuationCalculator() {
  const { plan } = useCurrentPlan();
  const [paywall, setPaywall] = useState(false);
  const result = computeEvacuationWidth({ occupants: 100, element: "puerta" });

  if (!canUseProCards(plan)) {
    return (
      <>
        <Card className="pro-calculator-card">
          <Lock size={22} className="text-accent" />
          <div>
            <div className="eyebrow">A.130 / Pro</div>
            <h2>Evacuación por ocupante</h2>
            <p className="muted">
              Calcula anchos de puertas, pasadizos y escaleras con el factor de ocupación.
            </p>
          </div>
          <Button variant="primary" onClick={() => setPaywall(true)}>
            Ver planes
          </Button>
        </Card>
        {paywall && <PaywallModal onClose={() => setPaywall(false)} />}
      </>
    );
  }

  return (
    <div className="calculator-layout">
      <Card className="calculator-inputs">
        <div className="eyebrow">Entrada / A.130</div>
        <h2>Ancho de evacuación</h2>
        <p className="muted small">
          Usa el módulo Pro para revisar puertas, pasadizos y escaleras.
        </p>
      </Card>
      <CalculatorResult
        eyebrow="RESULTADO / A.130"
        main={result.values.width.toFixed(2) + " m"}
        details={
          "Factor " +
          result.values.factor +
          " m/persona · mínimo " +
          result.values.minimumWidth.toFixed(2) +
          " m"
        }
        checks={result.checks}
        warnings={result.warnings}
        copyText={"TRAZZO · Evacuación A.130\nAncho " + result.values.width.toFixed(2) + " m"}
      />
    </div>
  );
}
