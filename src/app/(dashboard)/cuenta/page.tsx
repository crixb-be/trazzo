import { Suspense } from "react";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AccountPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando cuenta…" />}>
      <AccountWorkspace />
    </Suspense>
  );
}
