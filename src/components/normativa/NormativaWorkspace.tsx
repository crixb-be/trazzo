"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MeasuresWorkspace } from "@/components/medidas/MeasuresWorkspace";
import { NormativaCatalog } from "./NormativaCatalog";

export function NormativaWorkspace() {
  const params = useSearchParams();
  const showMeasures = params.get("tab") === "medidas";
  const measureQuery = params.get("q");
  const category = params.get("cat");
  const catalogHref = category ? "/normativa?cat=" + encodeURIComponent(category) : "/normativa";
  const measuresHref =
    "/normativa?tab=medidas" + (category ? "&cat=" + encodeURIComponent(category) : "");

  return (
    <>
      <nav className="segmented normativa-tabs" aria-label="Secciones de Normativa">
        <Link
          href={catalogHref}
          prefetch={false}
          aria-current={showMeasures ? undefined : "page"}
          onNavigate={(event) => {
            event.preventDefault();
            if (showMeasures) window.history.pushState(null, "", catalogHref);
          }}
        >
          Fichas RNE
        </Link>
        <Link
          href={measuresHref}
          prefetch={false}
          aria-current={showMeasures ? "page" : undefined}
          onNavigate={(event) => {
            event.preventDefault();
            if (!showMeasures) window.history.pushState(null, "", measuresHref);
          }}
        >
          Medidas de bolsillo
        </Link>
      </nav>
      {showMeasures ? (
        <MeasuresWorkspace key={measureQuery} initialQuery={measureQuery ?? ""} />
      ) : (
        <NormativaCatalog />
      )}
    </>
  );
}
