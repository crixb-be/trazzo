import { Suspense } from "react";
import { AccountWorkspace } from "@/components/account/AccountWorkspace";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="state-panel">Cargando cuenta…</div>}>
      <AccountWorkspace />
    </Suspense>
  );
}
