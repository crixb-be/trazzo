"use client";

import { X } from "lucide-react";
import {
  FEE_TYPOLOGIES,
  formatPen,
  formatWeekRange,
  type FeeQuoteResult,
} from "@/lib/calculators/fees";
import type { FeeQuote } from "@/lib/offline/db";

interface ProposalPreviewProps {
  quote: FeeQuote;
  result: FeeQuoteResult;
  professional: { fullName: string; capNumber: string };
  watermark: boolean;
  onClose: () => void;
}

export function ProposalPreview({
  quote,
  result,
  professional,
  watermark,
  onClose,
}: ProposalPreviewProps) {
  const typology =
    FEE_TYPOLOGIES.find((item) => item.value === quote.input.typology)?.label ??
    quote.input.typology;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal proposal-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa de propuesta"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-btn close" type="button" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className={"proposal-sheet" + (watermark ? " with-watermark" : "")}>
          <div className="proposal-header">
            <div>
              <strong>
                {professional.fullName ? "Arq. " + professional.fullName : "T R A Z Z O"}
              </strong>
              {professional.capNumber && <small>CAP N° {professional.capNumber}</small>}
              <small>Propuesta generada con TRAZZO</small>
            </div>
            <div>
              <strong>PROPUESTA DE HONORARIOS</strong>
              <small>{quote.code}</small>
            </div>
          </div>
          <div className="proposal-rule" />
          <div className="proposal-client-grid">
            <div>
              <small>CLIENTE</small>
              <strong>{quote.clientName || "—"}</strong>
            </div>
            <div>
              <small>PROYECTO</small>
              <strong>{quote.projectName || "—"}</strong>
            </div>
            <div>
              <small>UBICACIÓN</small>
              <strong>{quote.location || "—"}</strong>
            </div>
          </div>
          <h3>Resumen del proyecto</h3>
          <div className="proposal-key-grid">
            <span>Tipología</span>
            <strong>{typology}</strong>
            <span>Área techada</span>
            <strong>{quote.input.areaM2.toFixed(2)} m²</strong>
            <span>Pisos</span>
            <strong>{quote.input.floors}</strong>
            <span>Ubicación</span>
            <strong>{quote.location || "—"}</strong>
            <span>Plazo total</span>
            <strong>{quote.input.weeks} semanas</strong>
          </div>
          <h3>Propuesta económica</h3>
          <table className="proposal-table">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>Detalle</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr key={line.key}>
                  <td>{line.label}</td>
                  <td>{line.detail}</td>
                  <td>{formatPen(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Subtotal</td>
                <td>{formatPen(result.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={2}>{result.taxLabel}</td>
                <td>{formatPen(result.taxAmount)}</td>
              </tr>
              {result.retention > 0 && (
                <tr>
                  <td colSpan={2}>Retención 8% (si aplica)</td>
                  <td>- {formatPen(result.retention)}</td>
                </tr>
              )}
              <tr>
                <th colSpan={2}>TOTAL</th>
                <th>{formatPen(result.total)}</th>
              </tr>
            </tfoot>
          </table>
          <h3>1. Entregables</h3>
          <ul>
            {quote.deliverables.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <h3>2. Cronograma y tiempos de entrega</h3>
          <table className="proposal-table">
            <thead>
              <tr>
                <th>Hito</th>
                <th>Semanas</th>
              </tr>
            </thead>
            <tbody>
              {quote.schedule.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{formatWeekRange(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>3. Forma de pago</h3>
          <table className="proposal-table">
            <thead>
              <tr>
                <th>Armada</th>
                <th>%</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {quote.payment.installments.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{item.pct}%</td>
                  <td>{formatPen((result.total * item.pct) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>4. Condiciones específicas</h3>
          <ul>
            {quote.conditions.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="proposal-signatures">
            <div>
              <strong>Arq. {professional.fullName || "________________"}</strong>
              <small>CAP N° {professional.capNumber || "________________"}</small>
            </div>
            <div>
              <strong>Aceptación del cliente</strong>
              <small>{quote.clientName || "________________"}</small>
              <small>Fecha: ____</small>
            </div>
          </div>
          {watermark && <div className="preview-watermark">VISTA PREVIA · TRAZZO GRATIS</div>}
        </div>
      </div>
    </div>
  );
}
