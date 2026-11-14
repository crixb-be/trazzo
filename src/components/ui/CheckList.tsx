import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import type { CalcCheck } from "@/lib/calculators/types";

export interface CheckListProps {
  checks: CalcCheck[];
}

/** Formats check values without floating-point noise (0.18000000000000002 → 0.18). */
function formatValue(value: number | string): string {
  return typeof value === "number" ? String(Number(value.toFixed(3))) : String(value);
}

function referenceHref(reference: string): string {
  const match = reference.match(/[A-Z]{1,3}\.\d{3}/);
  return match ? "/normativa?q=" + encodeURIComponent(match[0]) : "/normativa";
}

export function CheckList({ checks }: CheckListProps) {
  if (checks.length === 0) {
    return <p className="muted small">No hay comprobaciones para mostrar.</p>;
  }

  return (
    <div className="check-list" aria-label="Comprobaciones normativas">
      {checks.map((check) => (
        <div className={"check " + (check.pass ? "pass" : "fail")} key={check.label}>
          {check.pass ? (
            <CheckCircle2 size={16} aria-label="Cumple" />
          ) : (
            <XCircle size={16} aria-label="No cumple" />
          )}
          <span>
            {check.label}
            <br />
            <span className="muted small mono">
              valor {formatValue(check.value)} · límite {formatValue(check.limit)} ·{" "}
              <Link href={referenceHref(check.ref)}>{check.ref}</Link>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
