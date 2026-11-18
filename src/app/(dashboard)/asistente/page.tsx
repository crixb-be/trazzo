import { Suspense } from "react";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";
import { dailyLimits } from "@/lib/ai/rate-limit";

export default function AssistantPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando asistente…" />}>
      <AssistantWorkspace limits={dailyLimits()} />
    </Suspense>
  );
}
