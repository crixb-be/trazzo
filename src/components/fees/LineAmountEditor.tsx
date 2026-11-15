"use client";

import { RotateCcw } from "lucide-react";
import { NumberField } from "@/components/ui";
import { formatPen, lineAdjustmentPct, type FeeLine } from "@/lib/calculators/fees";

export interface LineAmountEditorProps {
  line: FeeLine | undefined;
  /** A number sets a manual amount for the line; null restores the calculated one. */
  onOverride: (amount: number | null) => void;
}

/**
 * Editable amount of one fee line. The calculated amount stays as reference:
 * a lower manual amount shows the discount and a link to restore it.
 */
export function LineAmountEditor({ line, onOverride }: LineAmountEditorProps) {
  const amount = line?.amount ?? 0;
  const baseAmount = line?.baseAmount ?? 0;
  const adjustment = line ? lineAdjustmentPct(line) : 0;

  return (
    <div className="line-amount-editor">
      <NumberField
        label="Monto de la partida"
        unit="S/"
        value={amount}
        onValueChange={(value) => onOverride(value ?? 0)}
      />
      {line?.overridden && (
        <div className="line-adjustment">
          <span className={adjustment < 0 ? "line-discount" : "muted"}>
            {adjustment < 0
              ? `Descuento aplicado: ${Math.abs(adjustment).toFixed(1)}% sobre ${formatPen(baseAmount)}`
              : `Ajuste manual: +${adjustment.toFixed(1)}% sobre ${formatPen(baseAmount)}`}
          </span>
          <button type="button" className="link-button" onClick={() => onOverride(null)}>
            <RotateCcw size={12} aria-hidden="true" /> Restaurar {formatPen(baseAmount)}
          </button>
        </div>
      )}
    </div>
  );
}
