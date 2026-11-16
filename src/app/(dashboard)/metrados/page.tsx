import { Suspense } from "react";
import { MetradosWorkspace } from "@/components/metrados/MetradosWorkspace";

export default function MetradosPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando metrados…</div>}>
      <MetradosWorkspace />
    </Suspense>
  );
}
