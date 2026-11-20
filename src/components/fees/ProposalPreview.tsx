"use client";

import { X } from "lucide-react";
import {
  FEE_TYPOLOGIES,
  formatPen,
  lineDetailForProposal,
  formatWeekRange,
  groupDeliverables,
  paymentAmounts,
  type FeeQuoteResult,
} from "@/lib/calculators/fees";
import { signatureParties } from "@/lib/pdf/signatures";
import type { FeeQuote, StudioProfile } from "@/lib/offline/db";

interface ProposalPreviewProps {
  quote: FeeQuote;
  result: FeeQuoteResult;
  studio: StudioProfile;
  watermark: boolean;
  onClose: () => void;
}

export function ProposalPreview({
  quote,
  result,
  studio,
  watermark,
  onClose,
}: ProposalPreviewProps) {
  const typology =
    FEE_TYPOLOGIES.find((item) => item.value === quote.input.typology)?.label ??
    quote.input.typology;
  const title =
    quote.documentType === "cotizacion"
      ? "COTIZACIÓN DE DISEÑO Y PROYECTO"
      : "PROPUESTA DE SERVICIOS PROFESIONALES";
  const amounts = paymentAmounts(result.total, quote.payment.installments);

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
        <div className={"proposal-preview-stack" + (watermark ? " with-watermark" : "")}>
          <section
            className="proposal-sheet proposal-cover-sheet"
            style={
              {
                "--proposal-primary": studio.brandPrimary,
                "--proposal-secondary": studio.brandSecondary,
              } as React.CSSProperties
            }
          >
            <div className="cover-band" />
            <div className="cover-band-secondary" />
            <div className="cover-corner" />
            <div className="proposal-cover-logo">
              {studio.logoDataUrl ? (
                // The logo is already resized on the device and stored as a data URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studio.logoDataUrl} alt="Logo del estudio" />
              ) : (
                <strong>{studio.studioName.slice(0, 2).toUpperCase() || "T"}</strong>
              )}
            </div>
            <div className="proposal-cover-brand">
              {studio.studioName || "TRAZZO"}
              <small>ARQUITECTURA · DEL ESTUDIO A LA OBRA</small>
            </div>
            <div className="proposal-cover-title">
              <h2>{title}</h2>
              <div />
              <h3>{quote.projectName || "Proyecto sin nombre"}</h3>
              <p>{quote.location || "Ubicación por confirmar"}</p>
              <small>{quote.code}</small>
            </div>
            <div className="proposal-client-block">
              <b>EL CONTRATANTE</b>
              <strong>{quote.clientName || "Cliente por confirmar"}</strong>
              <span>Proyecto: {quote.projectName || "—"}</span>
              <span>Ubicación: {quote.location || "—"}</span>
            </div>
            <small className="proposal-cover-footer">
              Elaborado por: {studio.fullName ? "Arq. " + studio.fullName : "TRAZZO"} ·{" "}
              {studio.studioName || "Del estudio a la obra"}
            </small>
          </section>
          <section
            className="proposal-sheet proposal-content-sheet"
            style={
              {
                "--proposal-primary": studio.brandPrimary,
                "--proposal-secondary": studio.brandSecondary,
              } as React.CSSProperties
            }
          >
            <header className="proposal-content-header">
              <div className="proposal-mini-logo">
                {studio.logoDataUrl ? (
                  // The logo is already resized on the device and stored as a data URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studio.logoDataUrl} alt="" />
                ) : (
                  "T"
                )}
              </div>
              <div>
                <strong>{studio.studioName || "TRAZZO"}</strong>
                <small>{quote.code}</small>
              </div>
            </header>
            <h3 className="proposal-section-title">
              01 <span>RESUMEN DEL PROYECTO</span>
            </h3>
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
              <span>Documento</span>
              <strong>{quote.code}</strong>
            </div>
            <h3 className="proposal-section-title">
              02 <span>PROPUESTA ECONÓMICA</span>
            </h3>
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
                    <td>{lineDetailForProposal(line)}</td>
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
            <div className="proposal-payment-cards">
              {quote.payment.installments.slice(0, 3).map((item, index) => (
                <div key={item.label}>
                  <b>{index === 0 ? "ADELANTO (40%)" : "SALDO · " + item.pct + "%"}</b>
                  <strong>{formatPen(amounts[index] ?? 0)}</strong>
                </div>
              ))}
            </div>
            <h3 className="proposal-section-title">
              03 <span>ALCANCE Y ENTREGABLES</span>
            </h3>
            {groupDeliverables(quote.input, quote.deliverables).map((group) => (
              <div className="proposal-deliverable-group" key={group.group}>
                <strong>{group.group}</strong>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
            <h3 className="proposal-section-title">
              04 <span>CRONOGRAMA</span>
            </h3>
            <table className="proposal-table">
              <thead>
                <tr>
                  <th>Hito</th>
                  <th>Semanas</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                {quote.schedule.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{formatWeekRange(item)}</td>
                    <td>
                      {item.toWeek - item.fromWeek + 1} semana
                      {item.toWeek === item.fromWeek ? "" : "s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="proposal-section-title">
              05 <span>FORMA DE PAGO</span>
            </h3>
            <table className="proposal-table">
              <thead>
                <tr>
                  <th>Armada</th>
                  <th>Concepto</th>
                  <th>%</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {quote.payment.installments.map((item, index) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{index === 0 ? "Adelanto" : "Saldo"}</td>
                    <td>{item.pct}%</td>
                    <td>{formatPen(amounts[index] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="proposal-section-title">
              06 <span>CONDICIONES Y CLÁUSULAS</span>
            </h3>
            <ol>
              {quote.conditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="proposal-signatures-intro">
              En señal de conformidad, ambas partes suscriben la presente propuesta.
            </p>
            <div className="proposal-signatures">
              {signatureParties(quote, studio).map((party) => (
                <div className="proposal-signature" key={party.role}>
                  <div className="proposal-signature-space" aria-hidden="true" />
                  <strong>{party.role}</strong>
                  {party.name && <span>{party.name}</span>}
                  {party.details.map((detail) => (
                    <small key={detail}>{detail}</small>
                  ))}
                </div>
              ))}
            </div>
          </section>
          {watermark && <div className="preview-watermark">VISTA PREVIA · TRAZZO GRATIS</div>}
        </div>
      </div>
    </div>
  );
}
