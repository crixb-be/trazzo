import { Suspense } from "react";
import { NormativaCatalog } from "@/components/normativa/NormativaCatalog";

export default function NormativaPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando normativa…</div>}>
      <NormativaCatalog />
    </Suspense>
  );
}
