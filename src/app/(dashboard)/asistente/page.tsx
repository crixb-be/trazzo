import { Suspense } from "react";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AssistantPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando asistente…" />}>
      <AssistantWorkspace />
    </Suspense>
  );
}
