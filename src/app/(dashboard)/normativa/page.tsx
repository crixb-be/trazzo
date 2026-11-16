import { Suspense } from "react";
import { NormativaCatalog } from "@/components/normativa/NormativaCatalog";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NormativaPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando normativa…" />}>
      <NormativaCatalog />
    </Suspense>
  );
}
