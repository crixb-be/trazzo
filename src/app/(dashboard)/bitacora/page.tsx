import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteLogWorkspace } from "@/components/site-log/SiteLogWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = { title: "Bitácora de obra" };

export default function SiteLogPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando bitácora…" />}>
      <SiteLogWorkspace />
    </Suspense>
  );
}
