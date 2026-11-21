import { Suspense } from "react";
import { NormativaWorkspace } from "@/components/normativa/NormativaWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NormativaPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando normativa…" />}>
      <NormativaWorkspace />
    </Suspense>
  );
}
