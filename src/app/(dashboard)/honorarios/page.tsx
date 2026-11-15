import { Suspense } from "react";
import { FeeQuoteWorkspace } from "@/components/fees/FeeQuoteWorkspace";

export default function HonorariosPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando honorarios?</div>}>
      <FeeQuoteWorkspace />
    </Suspense>
  );
}
