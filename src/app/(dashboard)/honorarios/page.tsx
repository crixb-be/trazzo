import { Suspense } from "react";
import { FeeQuoteWorkspace } from "@/components/fees/FeeQuoteWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function HonorariosPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando honorarios…" />}>
      <FeeQuoteWorkspace />
    </Suspense>
  );
}
