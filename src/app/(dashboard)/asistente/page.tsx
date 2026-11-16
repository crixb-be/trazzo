import { Suspense } from "react";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando asistente…</div>}>
      <AssistantWorkspace />
    </Suspense>
  );
}
