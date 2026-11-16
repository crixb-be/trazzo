"use client";

import { Card } from "@/components/ui";
import { ANONYMOUS_AI_QUERIES_PER_DAY, PLANS } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";

/** Daily allowance for the current plan. Answers built on the device are not counted. */
export function AssistantQuota() {
  const { plan, signedIn } = useCurrentPlan();
  const limit = signedIn ? PLANS[plan].aiQueriesPerDay : ANONYMOUS_AI_QUERIES_PER_DAY;
  const unlimited = limit === Number.POSITIVE_INFINITY;
  return (
    <Card className="assistant-quota">
      <div className="eyebrow">CONSULTAS</div>
      <div className="quota-number mono">
        {unlimited ? "∞" : limit} <span>/ {unlimited ? "sin límite" : "día"}</span>
      </div>
      <p className="muted small">
        {signedIn
          ? "Plan " + PLANS[plan].label + ". El cupo se renueva cada día."
          : "Sin cuenta. Con una cuenta gratis tienes " +
            PLANS.free.aiQueriesPerDay +
            " por día."}{" "}
        Las respuestas armadas solo con fichas no cuentan.
      </p>
    </Card>
  );
}
