"use client";

import { Download, Eye, Save } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  formatPen,
  lineAdjustmentPct,
  type FeeQuoteResult,
  type TaxMode,
} from "@/lib/calculators/fees";

interface QuoteSummaryProps {
  result: FeeQuoteResult;
  tax: TaxMode;
  onTaxChange: (tax: TaxMode) => void;
  onSave: () => void;
  onPreview: () => void;
  onDownload: () => void;
  saving: boolean;
  paymentValid: boolean;
  notice: string;
}

export function QuoteSummary({
  result,
  tax,
  onTaxChange,
  onSave,
  onPreview,
  onDownload,
  saving,
  paymentValid,
  notice,
}: QuoteSummaryProps) {
  return (
    <Card className="quote-summary">
      <div className="eyebrow">RESUMEN DE HONORARIOS</div>
      <div className="summary-lines">
        {result.lines.map((line) => (
          <div className="summary-line" key={line.key}>
            <div>
              <strong>{line.label}</strong>
              <small>{line.detail}</small>
              {line.overridden && lineAdjustmentPct(line) < 0 && (
                <small className="line-discount">
                  Descuento {Math.abs(lineAdjustmentPct(line)).toFixed(1)}% sobre{" "}
                  {formatPen(line.baseAmount)}
                </small>
              )}
            </div>
            <span className="mono">{formatPen(line.amount)}</span>
          </div>
        ))}
      </div>
      <div className="summary-total-row">
        <span>Subtotal</span>
        <strong className="mono">{formatPen(result.subtotal)}</strong>
      </div>
      <div className="tax-toggle" role="radiogroup" aria-label="Tipo de impuesto">
        <button
          className={tax === "igv" ? "active" : ""}
          type="button"
          role="radio"
          aria-checked={tax === "igv"}
          onClick={() => onTaxChange("igv")}
        >
          IGV 18%
        </button>
        <button
          className={tax === "rxh" ? "active" : ""}
          type="button"
          role="radio"
          aria-checked={tax === "rxh"}
          onClick={() => onTaxChange("rxh")}
        >
          Recibo por Honorarios
        </button>
      </div>
      <div className="summary-tax-row">
        <span>{result.taxLabel}</span>
        <span className="mono">{formatPen(result.taxAmount)}</span>
      </div>
      {result.retention > 0 && (
        <div className="summary-tax-row">
          <span>Retención 8% (si aplica)</span>
          <span className="mono">- {formatPen(result.retention)}</span>
        </div>
      )}
      <div className="grand-total">
        <span>TOTAL</span>
        <strong className="mono">{formatPen(result.total)}</strong>
      </div>
      {result.warnings.length > 0 && (
        <div className="quote-warnings">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
      <div className="summary-actions">
        <Button onClick={onSave} disabled={saving || !paymentValid}>
          {<Save size={15} />} {saving ? "Guardando…" : "Guardar cotización"}
        </Button>
        <Button variant="secondary" onClick={onPreview}>
          <Eye size={15} /> Vista previa
        </Button>
        <Button variant="secondary" onClick={onDownload}>
          <Download size={15} /> Descargar PDF
        </Button>
      </div>
      {notice && <p className="notice-inline">{notice}</p>}
    </Card>
  );
}
