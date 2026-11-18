"use client";

import { Card } from "@/components/ui";
import { PLANS, type Plan } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";

/** Daily allowance for the current plan. Answers built on the device are not counted. */
export function AssistantQuota({ limits }: { limits: Record<Plan, number> }) {
  const { plan, signedIn } = useCurrentPlan();
  const limit = limits[signedIn ? plan : "free"];
  return (
    <Card className="assistant-quota">
      <div className="eyebrow">CONSULTAS</div>
      <div className="quota-number mono">
        {limit} <span>/ día</span>
      </div>
      <p className="muted small">
        {signedIn ? "Plan " + PLANS[plan].label + "." : "Sin cuenta."} El cupo se renueva a
        medianoche (hora de Perú). Las respuestas armadas solo con fichas no cuentan.
      </p>
    </Card>
  );
}
