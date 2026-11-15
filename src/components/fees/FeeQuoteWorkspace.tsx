"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, PaywallModal } from "@/components/ui";
import {
  calculateFeeQuote,
  createDefaultFeeInput,
  defaultDeliverables,
  defaultSchedule,
  DEFAULT_CONDITIONS,
  formatPen,
  validatePaymentPlan,
  type FeeQuoteResult,
} from "@/lib/calculators/fees";
import { buildProposalPdf, exportProposalPdf } from "@/lib/pdf/export-proposal";
import { canExportCleanProposal } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import {
  duplicateFeeQuote,
  deleteFeeQuote,
  saveFeeQuote,
  type FeeQuoteDraft,
} from "@/lib/offline/fee-quotes";
import { useFeeQuotes, useProfessionalProfile } from "@/lib/offline/hooks";
import type { FeeQuote } from "@/lib/offline/db";
import { ProposalPreview } from "./ProposalPreview";
import { QuoteForm } from "./QuoteForm";
import { QuoteSummary } from "./QuoteSummary";

function initialDraft(): FeeQuoteDraft {
  const input = createDefaultFeeInput();
  return {
    projectName: "",
    clientName: "",
    location: "",
    input,
    deliverables: defaultDeliverables(input),
    schedule: defaultSchedule(input),
    payment: {
      presetId: "50-50",
      installments: [
        { label: "Inicio", pct: 50 },
        { label: "Entrega", pct: 50 },
      ],
    },
    conditions: [...DEFAULT_CONDITIONS],
  };
}
function draftFromQuote(quote: FeeQuote): FeeQuoteDraft {
  return {
    projectName: quote.projectName,
    clientName: quote.clientName,
    location: quote.location,
    input: quote.input,
    deliverables: [...quote.deliverables],
    schedule: [...quote.schedule],
    payment: {
      presetId: quote.payment.presetId,
      installments: quote.payment.installments.map((item) => ({ ...item })),
    },
    conditions: [...quote.conditions],
  };
}

export function FeeQuoteWorkspace() {
  const quotes = useFeeQuotes();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("quote");
  const activeQuote = quotes.find((quote) => quote.id === selectedId) ?? null;
  const profile = useProfessionalProfile();
  const currentPlan = useCurrentPlan();
  const [draft, setDraft] = useState<FeeQuoteDraft>(() => initialDraft());
  const [touched, setTouched] = useState({ deliverables: false, schedule: false });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (activeQuote) {
      setDraft(draftFromQuote(activeQuote));
      setTouched({ deliverables: true, schedule: true });
    }
  }, [activeQuote?.id]);
  const regenerationKey = JSON.stringify({
    typology: draft.input.typology,
    areaM2: draft.input.areaM2,
    weeks: draft.input.weeks,
    scope: draft.input.scope,
  });
  useEffect(() => {
    if (touched.deliverables && touched.schedule) return;
    setDraft((current) => ({
      ...current,
      deliverables: touched.deliverables
        ? current.deliverables
        : defaultDeliverables(current.input),
      schedule: touched.schedule ? current.schedule : defaultSchedule(current.input),
    }));
  }, [regenerationKey, touched.deliverables, touched.schedule]);
  const result = useMemo(() => calculateFeeQuote(draft.input), [draft.input]);
  const paymentValidation = validatePaymentPlan(draft.payment.installments);
  const watermarked = currentPlan.mode === "account" && !canExportCleanProposal(currentPlan.plan);

  const quoteForPdf = (): FeeQuote => ({
    id: activeQuote?.id ?? "preview",
    code: activeQuote?.code ?? "COT-PREVIA",
    projectName: draft.projectName || "Propuesta sin nombre",
    clientName: draft.clientName,
    location: draft.location,
    input: draft.input,
    deliverables: draft.deliverables,
    schedule: draft.schedule,
    payment: draft.payment,
    conditions: draft.conditions,
    totals: { subtotal: result.subtotal, taxAmount: result.taxAmount, total: result.total },
    createdAt: activeQuote?.createdAt ?? "",
    updatedAt: activeQuote?.updatedAt ?? "",
    syncState: "local",
  });
  const selectQuote = (id: string): void =>
    window.history.replaceState(null, "", "/honorarios?quote=" + id);
  const newQuote = (): void => {
    setDraft(initialDraft());
    setTouched({ deliverables: false, schedule: false });
    setNotice("");
    window.history.replaceState(null, "", "/honorarios");
  };
  const save = async (): Promise<void> => {
    if (!draft.projectName.trim()) {
      setNotice("Agrega un nombre de proyecto antes de guardar.");
      return;
    }
    if (!draft.payment.installments.length || !paymentValidation.ok) {
      setNotice("Corrige la forma de pago: la suma debe ser 100%.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveFeeQuote(
        draft,
        activeQuote
          ? { id: activeQuote.id, code: activeQuote.code, createdAt: activeQuote.createdAt }
          : undefined,
      );
      selectQuote(saved.id);
      setNotice("Cotización guardada localmente.");
    } catch {
      setNotice("No se pudo guardar la cotización.");
    } finally {
      setSaving(false);
    }
  };
  const duplicate = async (): Promise<void> => {
    if (!activeQuote) return;
    const copy = await duplicateFeeQuote(activeQuote.id);
    selectQuote(copy.id);
    setNotice("Cotización duplicada.");
  };
  const remove = async (): Promise<void> => {
    if (!activeQuote || !window.confirm("¿Eliminar " + activeQuote.code + "—")) return;
    await deleteFeeQuote(activeQuote.id);
    newQuote();
    setNotice("Cotización eliminada.");
  };
  const download = (): void => {
    if (currentPlan.mode === "local" || canExportCleanProposal(currentPlan.plan)) {
      exportProposalPdf(quoteForPdf(), result, { professional: profile, watermark: false });
      return;
    }
    setPaywall(true);
  };
  const downloadWatermarked = (): void => {
    exportProposalPdf(quoteForPdf(), result, { professional: profile, watermark: true });
    setPaywall(false);
  };

  return (
    <div className="fees-page">
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">PROYECTOS / HONORARIOS</div>
          <h1 className="page-title">Honorarios y propuestas</h1>
          <p className="lead">
            Cotiza con claridad, guarda tus condiciones y entrega una propuesta lista para
            conversar.
          </p>
        </div>
        <span className="chip">{quotes.length} guardadas</span>
      </div>
      <div className="fees-layout">
        <aside className="quote-sidebar">
          <div className="sidebar-heading">
            <div className="eyebrow">COTIZACIONES</div>
            <button className="btn btn-primary" type="button" onClick={newQuote}>
              <Plus size={15} /> Nueva
            </button>
          </div>
          <div className="saved-quotes-list">
            {quotes.length === 0 && (
              <p className="muted small">Tus cotizaciones guardadas aparecerán aquí.</p>
            )}
            {quotes.map((quote) => (
              <button
                className={quote.id === selectedId ? "saved-quote active" : "saved-quote"}
                key={quote.id}
                type="button"
                onClick={() => selectQuote(quote.id)}
              >
                <strong>{quote.code}</strong>
                <span>{quote.projectName || "Sin proyecto"}</span>
                <small>{quote.clientName || "Sin cliente"}</small>
                <b className="mono">{formatPen(quote.totals.total)}</b>
              </button>
            ))}
          </div>
          {activeQuote && (
            <div className="sidebar-actions">
              <Button variant="secondary" onClick={() => void duplicate()}>
                <Copy size={15} /> Duplicar
              </Button>
              <Button variant="danger" onClick={() => void remove()}>
                <Trash2 size={15} /> Eliminar
              </Button>
            </div>
          )}
        </aside>
        <main className="quote-editor">
          <QuoteForm
            draft={draft}
            result={result}
            onChange={setDraft}
            onTouchDeliverables={() =>
              setTouched((current) => ({ ...current, deliverables: true }))
            }
            onTouchSchedule={() => setTouched((current) => ({ ...current, schedule: true }))}
          />
        </main>
        <QuoteSummary
          result={result}
          tax={draft.input.tax}
          onTaxChange={(tax) =>
            setDraft((current) => ({ ...current, input: { ...current.input, tax } }))
          }
          onSave={() => void save()}
          onPreview={() => setPreview(true)}
          onDownload={download}
          saving={saving}
          paymentValid={paymentValidation.ok}
          notice={notice}
        />
      </div>
      {profile.fullName === "" && (
        <p className="profile-hint">
          Agrega tu nombre y N° CAP en <a href="/cuenta">Cuenta</a> para personalizar la propuesta.
        </p>
      )}
      {preview && (
        <ProposalPreview
          quote={quoteForPdf()}
          result={result}
          professional={profile}
          watermark={watermarked}
          onClose={() => setPreview(false)}
        />
      )}
      {paywall && (
        <PaywallModal
          title="Descarga la propuesta sin marca de agua"
          onClose={() => setPaywall(false)}
        >
          <p>
            La vista previa está completa. En el plan Gratis, el PDF se descarga con una marca de
            agua.
          </p>
          <Button variant="secondary" onClick={downloadWatermarked}>
            Descargar con marca de agua
          </Button>
        </PaywallModal>
      )}
    </div>
  );
}
