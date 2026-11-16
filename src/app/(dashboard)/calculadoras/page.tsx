import { Suspense } from "react";
import { CalculatorWorkspace } from "@/components/calculators/CalculatorWorkspace";

export default function CalculatorsPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando calculadoras…</div>}>
      <CalculatorWorkspace />
    </Suspense>
  );
}
