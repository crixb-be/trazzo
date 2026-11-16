import { Suspense } from "react";
import { CalculatorWorkspace } from "@/components/calculators/CalculatorWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CalculatorsPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando calculadoras…" />}>
      <CalculatorWorkspace />
    </Suspense>
  );
}
