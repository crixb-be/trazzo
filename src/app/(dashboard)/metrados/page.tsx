import { Suspense } from "react";
import { MetradosWorkspace } from "@/components/metrados/MetradosWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function MetradosPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando proyectos…" />}>
      <MetradosWorkspace />
    </Suspense>
  );
}
