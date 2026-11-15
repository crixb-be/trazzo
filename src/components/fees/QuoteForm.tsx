"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, Input, NumberField, Select } from "@/components/ui";
import {
  DEFAULT_CONDITIONS,
  DEFAULT_FEE_RATES,
  defaultDeliverables,
  defaultSchedule,
  FEE_TYPOLOGIES,
  formatPen,
  PAYMENT_PRESETS,
  paymentAmounts,
  validatePaymentPlan,
  type FeeQuoteResult,
  type FeeRates,
  type FeeScope,
  type LicenseModality,
  type PaymentInstallment,
} from "@/lib/calculators/fees";
import type { FeeLineKey } from "@/lib/calculators/fees";
import type { FeeQuoteDraft } from "@/lib/offline/fee-quotes";
import { LineAmountEditor } from "./LineAmountEditor";

interface QuoteFormProps {
  draft: FeeQuoteDraft;
  result: FeeQuoteResult;
  onChange: (draft: FeeQuoteDraft) => void;
  onTouchDeliverables: () => void;
  onTouchSchedule: () => void;
  onResetRates: () => void;
  hasCustomRates: boolean;
  /** Signer taken from the studio profile, shown as placeholder for the overrides. */
  signerDefaults: { name: string; document: string };
}

const specialtyLabels = {
  estructuras: "Estructuras",
  sanitarias: "Inst. Sanitarias",
  electricas: "Inst. Eléctricas",
} as const;
const modalityOptions = (["A", "B", "C", "D"] as LicenseModality[]).map((value) => ({
  value,
  label: "Modalidad " + value,
}));

function updateRates(rates: FeeRates, patch: Partial<FeeRates>): FeeRates {
  return { ...rates, ...patch };
}

export function QuoteForm({
  draft,
  result,
  onChange,
  onTouchDeliverables,
  onTouchSchedule,
  onResetRates,
  hasCustomRates,
  signerDefaults,
}: QuoteFormProps) {
  const [showRates, setShowRates] = useState(false);
  const input = draft.input;
  const scope = input.scope;
  const lineFor = (key: FeeLineKey) => result.lines.find((line) => line.key === key);
  const lineAmount = (key: FeeLineKey): number => lineFor(key)?.amount ?? 0;
  const changeInput = (next: Partial<typeof input>): void =>
    onChange({ ...draft, input: { ...input, ...next } });
  // null removes the manual amount so the line goes back to its calculated value.
  const setLineOverride = (key: FeeLineKey, amount: number | null): void => {
    const next = { ...input.lineOverrides };
    if (amount === null) delete next[key];
    else next[key] = amount;
    changeInput({ lineOverrides: next });
  };
  const amountEditor = (key: FeeLineKey) => (
    <LineAmountEditor line={lineFor(key)} onOverride={(amount) => setLineOverride(key, amount)} />
  );
  const changeScope = (next: Partial<FeeScope>): void =>
    changeInput({ scope: { ...scope, ...next } });
  const changeDeliverable = (index: number, value: string): void => {
    onTouchDeliverables();
    onChange({
      ...draft,
      deliverables: draft.deliverables.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    });
  };
  const changeCondition = (index: number, value: string): void =>
    onChange({
      ...draft,
      conditions: draft.conditions.map((item, itemIndex) => (itemIndex === index ? value : item)),
    });
  const changePayment = (index: number, patch: Partial<PaymentInstallment>): void =>
    onChange({
      ...draft,
      payment: {
        ...draft.payment,
        installments: draft.payment.installments.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    });
  const paymentValues = paymentAmounts(result.total, draft.payment.installments);
  const paymentValidation = validatePaymentPlan(draft.payment.installments);

  return (
    <div className="quote-form">
      <Card>
        <div className="eyebrow">01 / DATOS DEL PROYECTO</div>
        <div className="form-grid two-columns">
          <Select
            label="Tipo de documento"
            value={draft.documentType}
            options={[
              { value: "propuesta", label: "Propuesta de servicios profesionales" },
              { value: "cotizacion", label: "Cotización de diseño y proyecto" },
            ]}
            onChange={(event) =>
              onChange({ ...draft, documentType: event.target.value as "propuesta" | "cotizacion" })
            }
          />
          <div className="field">
            <label>Nombre del proyecto</label>
            <Input
              value={draft.projectName}
              onChange={(event) => onChange({ ...draft, projectName: event.target.value })}
              placeholder="Casa Miraflores"
            />
          </div>
          <div className="field">
            <label>Cliente</label>
            <Input
              value={draft.clientName}
              onChange={(event) => onChange({ ...draft, clientName: event.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="field">
            <label htmlFor="quote-client-document">DNI / RUC del cliente (opcional)</label>
            <Input
              id="quote-client-document"
              inputMode="numeric"
              value={draft.clientDocument}
              onChange={(event) => onChange({ ...draft, clientDocument: event.target.value })}
              placeholder="Aparece bajo la firma del contratante"
            />
          </div>
          <div className="field">
            <label>Ubicación</label>
            <Input
              value={draft.location}
              onChange={(event) => onChange({ ...draft, location: event.target.value })}
              placeholder="Distrito, ciudad"
            />
          </div>
          <div className="field">
            <label htmlFor="quote-signer-name">Firma del proyectista</label>
            <Input
              id="quote-signer-name"
              value={draft.signerName}
              onChange={(event) => onChange({ ...draft, signerName: event.target.value })}
              placeholder={signerDefaults.name || "Arq. Nombre Apellido"}
            />
          </div>
          <div className="field">
            <label htmlFor="quote-signer-document">N° CAP / RUC del proyectista</label>
            <Input
              id="quote-signer-document"
              value={draft.signerDocument}
              onChange={(event) => onChange({ ...draft, signerDocument: event.target.value })}
              placeholder={signerDefaults.document || "CAP N° 00000"}
            />
          </div>
          <Select
            label="Tipología"
            value={input.typology}
            onChange={(event) =>
              changeInput({ typology: event.target.value as typeof input.typology })
            }
            options={FEE_TYPOLOGIES}
          />
          <NumberField
            label="Área techada"
            unit="m²"
            value={input.areaM2}
            onValueChange={(value) => changeInput({ areaM2: value ?? 0 })}
          />
          <NumberField
            label="Pisos"
            value={input.floors}
            step={1}
            onValueChange={(value) => changeInput({ floors: value ?? 0 })}
          />
          <NumberField
            label="Plazo total"
            unit="semanas"
            value={input.weeks}
            step={1}
            onValueChange={(value) => changeInput({ weeks: value ?? 0 })}
          />
        </div>
      </Card>

      <Card>
        <div className="eyebrow">02 / ALCANCE Y ESPECIALIDADES</div>
        <div className="scope-list">
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.design}
                onChange={(event) => changeScope({ design: event.target.checked })}
              />
              <span>
                <strong>Diseño arquitectónico</strong>
                <small>Anteproyecto y documentación base</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("design"))}</strong>
            {scope.design && (
              <div className="scope-sub-fields">
                <NumberField
                  label="S/ por m²"
                  value={input.rates.designPerM2[input.typology]}
                  onValueChange={(value) =>
                    changeInput({
                      rates: updateRates(input.rates, {
                        designPerM2: { ...input.rates.designPerM2, [input.typology]: value ?? 0 },
                      }),
                    })
                  }
                />
                {amountEditor("design")}
              </div>
            )}
          </div>
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.expediente.enabled}
                onChange={(event) =>
                  changeScope({
                    expediente: { ...scope.expediente, enabled: event.target.checked },
                  })
                }
              />
              <span>
                <strong>Expediente de especialidades</strong>
                <small>Planos y memorias técnicas</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("expediente"))}</strong>
            {scope.expediente.enabled && (
              <div className="scope-sub-fields">
                <div className="checkbox-grid">
                  {(Object.keys(specialtyLabels) as Array<keyof typeof specialtyLabels>).map(
                    (specialty) => (
                      <label key={specialty}>
                        <input
                          type="checkbox"
                          checked={scope.expediente[specialty]}
                          onChange={(event) =>
                            changeScope({
                              expediente: {
                                ...scope.expediente,
                                [specialty]: event.target.checked,
                              },
                            })
                          }
                        />
                        {specialtyLabels[specialty]}
                      </label>
                    ),
                  )}
                </div>
                <div className="inline-rate-grid">
                  {(Object.keys(specialtyLabels) as Array<keyof typeof specialtyLabels>).map(
                    (specialty) => (
                      <NumberField
                        key={specialty}
                        label={specialtyLabels[specialty] + " · S/ m²"}
                        value={input.rates.specialtyPerM2[specialty]}
                        onValueChange={(value) =>
                          changeInput({
                            rates: updateRates(input.rates, {
                              specialtyPerM2: {
                                ...input.rates.specialtyPerM2,
                                [specialty]: value ?? 0,
                              },
                            }),
                          })
                        }
                      />
                    ),
                  )}
                </div>
                {amountEditor("expediente")}
              </div>
            )}
          </div>
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.renders.enabled}
                onChange={(event) =>
                  changeScope({ renders: { ...scope.renders, enabled: event.target.checked } })
                }
              />
              <span>
                <strong>Renders y recorrido virtual</strong>
                <small>Imágenes de presentación</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("renders"))}</strong>
            {scope.renders.enabled && (
              <div className="scope-sub-fields">
                <NumberField
                  label="Cantidad de renders"
                  value={scope.renders.count}
                  step={1}
                  onValueChange={(value) =>
                    changeScope({ renders: { ...scope.renders, count: value ?? 0 } })
                  }
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={scope.renders.virtualTour}
                    onChange={(event) =>
                      changeScope({
                        renders: { ...scope.renders, virtualTour: event.target.checked },
                      })
                    }
                  />{" "}
                  Recorrido virtual
                </label>
                <NumberField
                  label="S/ por render"
                  value={input.rates.renderUnit}
                  onValueChange={(value) =>
                    changeInput({ rates: updateRates(input.rates, { renderUnit: value ?? 0 }) })
                  }
                />
                {scope.renders.virtualTour && (
                  <NumberField
                    label="S/ recorrido"
                    value={input.rates.virtualTour}
                    onValueChange={(value) =>
                      changeInput({ rates: updateRates(input.rates, { virtualTour: value ?? 0 }) })
                    }
                  />
                )}
                {amountEditor("renders")}
              </div>
            )}
          </div>
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.license.enabled}
                onChange={(event) =>
                  changeScope({ license: { ...scope.license, enabled: event.target.checked } })
                }
              />
              <span>
                <strong>Gestión de licencia</strong>
                <small>Expediente para trámite municipal</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("license"))}</strong>
            {scope.license.enabled && (
              <div className="scope-sub-fields">
                <Select
                  label="Modalidad"
                  value={scope.license.modality}
                  options={modalityOptions}
                  onChange={(event) =>
                    changeScope({
                      license: {
                        ...scope.license,
                        modality: event.target.value as LicenseModality,
                      },
                    })
                  }
                />
                <NumberField
                  label={"S/ modalidad " + scope.license.modality}
                  value={input.rates.licenseByModality[scope.license.modality]}
                  onValueChange={(value) =>
                    changeInput({
                      rates: updateRates(input.rates, {
                        licenseByModality: {
                          ...input.rates.licenseByModality,
                          [scope.license.modality]: value ?? 0,
                        },
                      }),
                    })
                  }
                />
                {amountEditor("license")}
              </div>
            )}
          </div>
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.supervision.enabled}
                onChange={(event) =>
                  changeScope({
                    supervision: { ...scope.supervision, enabled: event.target.checked },
                  })
                }
              />
              <span>
                <strong>Supervisión de obra</strong>
                <small>Visitas o porcentaje del presupuesto</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("supervision"))}</strong>
            {scope.supervision.enabled && (
              <div className="scope-sub-fields">
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      checked={scope.supervision.mode === "visits"}
                      onChange={() =>
                        changeScope({ supervision: { ...scope.supervision, mode: "visits" } })
                      }
                    />{" "}
                    Visitas
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={scope.supervision.mode === "percent"}
                      onChange={() =>
                        changeScope({ supervision: { ...scope.supervision, mode: "percent" } })
                      }
                    />{" "}
                    Porcentaje
                  </label>
                </div>
                {scope.supervision.mode === "visits" && (
                  <NumberField
                    label="S/ por visita"
                    value={input.rates.supervisionVisit}
                    onValueChange={(value) =>
                      changeInput({
                        rates: updateRates(input.rates, { supervisionVisit: value ?? 0 }),
                      })
                    }
                  />
                )}
                {scope.supervision.mode === "visits" && (
                  <NumberField
                    label="Visitas por semana"
                    value={scope.supervision.visitsPerWeek}
                    step={1}
                    onValueChange={(value) =>
                      changeScope({
                        supervision: { ...scope.supervision, visitsPerWeek: value ?? 0 },
                      })
                    }
                  />
                )}
                {scope.supervision.mode === "percent" && (
                  <NumberField
                    label="% del presupuesto de obra"
                    value={(input.rates.supervisionPct ?? 0) * 100}
                    min={0}
                    max={100}
                    onValueChange={(value) =>
                      changeInput({
                        rates: updateRates(input.rates, { supervisionPct: (value ?? 0) / 100 }),
                      })
                    }
                  />
                )}
                <NumberField
                  label="Semanas de supervisión"
                  value={scope.supervision.weeks}
                  step={1}
                  onValueChange={(value) =>
                    changeScope({ supervision: { ...scope.supervision, weeks: value ?? 0 } })
                  }
                />
                {amountEditor("supervision")}
              </div>
            )}
          </div>
          <div className="scope-option">
            <label>
              <input
                type="checkbox"
                checked={scope.execution.enabled}
                onChange={(event) => changeScope({ execution: { enabled: event.target.checked } })}
              />
              <span>
                <strong>Dirección técnica y administración</strong>
                <small>Gestión de la ejecución</small>
              </span>
            </label>
            <strong className="mono">{formatPen(lineAmount("execution"))}</strong>
            {scope.execution.enabled && (
              <div className="scope-sub-fields">
                <NumberField
                  label="% dirección técnica"
                  value={(input.rates.executionPct ?? 0) * 100}
                  min={0}
                  max={100}
                  onValueChange={(value) =>
                    changeInput({
                      rates: updateRates(input.rates, { executionPct: (value ?? 0) / 100 }),
                    })
                  }
                />
                <p className="muted small">
                  Presupuesto usado: {formatPen(result.constructionBudget)}
                </p>
                <NumberField
                  label="Presupuesto referencial de obra (S/)"
                  value={input.constructionBudget}
                  min={0}
                  hint={"Por defecto: " + formatPen(result.constructionBudget)}
                  onValueChange={(value) => changeInput({ constructionBudget: value })}
                />
                {amountEditor("execution")}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="rates-card">
        <button className="collapse-trigger" type="button" onClick={() => setShowRates(!showRates)}>
          <span>
            <span className="eyebrow">03 / TARIFAS REFERENCIALES</span>
            <small>
              {hasCustomRates
                ? "Tarifas personalizadas guardadas en este dispositivo."
                : "Tarifas referenciales del mercado peruano; ajústalas a tu práctica."}
            </small>
          </span>
          <ChevronDown size={18} className={showRates ? "rotated" : ""} />
        </button>
        {showRates && (
          <div className="rates-panel">
            <div className="form-grid two-columns">
              <NumberField
                label="Diseño por m²"
                value={input.rates.designPerM2[input.typology]}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      designPerM2: {
                        ...input.rates.designPerM2,
                        [input.typology]: value ?? 0,
                      },
                    }),
                  })
                }
              />
              <NumberField
                label="Factor por piso extra"
                value={input.rates.floorFactorPerExtraFloor}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      floorFactorPerExtraFloor: value ?? 0,
                    }),
                  })
                }
              />
              <NumberField
                label="Factor máximo"
                value={input.rates.maxFloorFactor}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { maxFloorFactor: value ?? 0 }),
                  })
                }
              />
              <NumberField
                label="Estructuras por m²"
                value={input.rates.specialtyPerM2.estructuras}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      specialtyPerM2: {
                        ...input.rates.specialtyPerM2,
                        estructuras: value ?? 0,
                      },
                    }),
                  })
                }
              />
              <NumberField
                label="Sanitarias por m²"
                value={input.rates.specialtyPerM2.sanitarias}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      specialtyPerM2: {
                        ...input.rates.specialtyPerM2,
                        sanitarias: value ?? 0,
                      },
                    }),
                  })
                }
              />
              <NumberField
                label="Eléctricas por m²"
                value={input.rates.specialtyPerM2.electricas}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      specialtyPerM2: {
                        ...input.rates.specialtyPerM2,
                        electricas: value ?? 0,
                      },
                    }),
                  })
                }
              />
              <NumberField
                label="Render unitario"
                value={input.rates.renderUnit}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { renderUnit: value ?? 0 }),
                  })
                }
              />
              <NumberField
                label="Recorrido virtual"
                value={input.rates.virtualTour}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { virtualTour: value ?? 0 }),
                  })
                }
              />
              <NumberField
                label="Licencia A"
                value={input.rates.licenseByModality.A}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      licenseByModality: { ...input.rates.licenseByModality, A: value ?? 0 },
                    }),
                  })
                }
              />
              <NumberField
                label="Licencia B"
                value={input.rates.licenseByModality.B}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      licenseByModality: { ...input.rates.licenseByModality, B: value ?? 0 },
                    }),
                  })
                }
              />
              <NumberField
                label="Licencia C"
                value={input.rates.licenseByModality.C}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      licenseByModality: { ...input.rates.licenseByModality, C: value ?? 0 },
                    }),
                  })
                }
              />
              <NumberField
                label="Licencia D"
                value={input.rates.licenseByModality.D}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      licenseByModality: { ...input.rates.licenseByModality, D: value ?? 0 },
                    }),
                  })
                }
              />
              <NumberField
                label="Visita de supervisión"
                value={input.rates.supervisionVisit}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { supervisionVisit: value ?? 0 }),
                  })
                }
              />
              <NumberField
                label="Supervisión (%)"
                value={input.rates.supervisionPct * 100}
                min={0}
                max={100}
                step={0.1}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { supervisionPct: (value ?? 0) / 100 }),
                  })
                }
              />
              <NumberField
                label="Costo obra por m²"
                value={input.rates.constructionCostPerM2[input.typology]}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, {
                      constructionCostPerM2: {
                        ...input.rates.constructionCostPerM2,
                        [input.typology]: value ?? 0,
                      },
                    }),
                  })
                }
              />
              <NumberField
                label="Ejecución (%)"
                value={input.rates.executionPct * 100}
                min={0}
                max={100}
                step={0.1}
                onValueChange={(value) =>
                  changeInput({
                    rates: updateRates(input.rates, { executionPct: (value ?? 0) / 100 }),
                  })
                }
              />
            </div>
            <button className="btn btn-ghost" type="button" onClick={onResetRates}>
              Restablecer tarifas
            </button>
          </div>
        )}
      </Card>

      <Card>
        <div className="eyebrow">04 / ENTREGABLES</div>
        <div className="editable-list">
          {draft.deliverables.map((item, index) => (
            <div className="editable-row" key={index}>
              <Input
                value={item}
                onChange={(event) => changeDeliverable(index, event.target.value)}
              />
              <button
                className="icon-btn"
                type="button"
                onClick={() => {
                  onTouchDeliverables();
                  onChange({
                    ...draft,
                    deliverables: draft.deliverables.filter((_, itemIndex) => itemIndex !== index),
                  });
                }}
                aria-label="Eliminar entregable"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="inline-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              onTouchDeliverables();
              onChange({ ...draft, deliverables: [...draft.deliverables, "Nuevo entregable"] });
            }}
          >
            <Plus size={15} /> Agregar entregable
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              onTouchDeliverables();
              onChange({ ...draft, deliverables: defaultDeliverables(input) });
            }}
          >
            Regenerar desde alcance
          </button>
        </div>
      </Card>

      <Card>
        <div className="eyebrow">05 / FORMA DE PAGO</div>
        <Select
          label="Preset"
          value={draft.payment.presetId}
          options={PAYMENT_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
          onChange={(event) => {
            const preset =
              PAYMENT_PRESETS.find((item) => item.id === event.target.value) ?? PAYMENT_PRESETS[0]!;
            onChange({
              ...draft,
              payment: {
                presetId: preset.id,
                installments: preset.installments.map((item) => ({ ...item })),
              },
            });
          }}
        />{" "}
        <div className="payment-rows">
          {draft.payment.installments.map((installment, index) => (
            <div className="payment-row" key={index}>
              <Input
                value={installment.label}
                onChange={(event) => changePayment(index, { label: event.target.value })}
              />
              <NumberField
                label="%"
                value={installment.pct}
                onValueChange={(value) => changePayment(index, { pct: value ?? 0 })}
              />
              <span className="mono payment-amount">{formatPen(paymentValues[index] ?? 0)}</span>
              <button
                className="icon-btn"
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    payment: {
                      ...draft.payment,
                      installments: draft.payment.installments.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                      presetId: "custom",
                    },
                  })
                }
                aria-label="Eliminar cuota"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        {draft.payment.presetId === "custom" && (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() =>
              onChange({
                ...draft,
                payment: {
                  ...draft.payment,
                  installments: [...draft.payment.installments, { label: "Nueva cuota", pct: 0 }],
                },
              })
            }
          >
            <Plus size={15} /> Agregar cuota
          </button>
        )}
      </Card>

      <Card>
        <div className="eyebrow">06 / CRONOGRAMA</div>
        <div className="schedule-rows">
          {draft.schedule.map((milestone, index) => (
            <div className="schedule-row" key={index}>
              <Input
                value={milestone.label}
                onChange={(event) => {
                  onTouchSchedule();
                  onChange({
                    ...draft,
                    schedule: draft.schedule.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item,
                    ),
                  });
                }}
              />
              <NumberField
                label="Desde"
                value={milestone.fromWeek}
                step={1}
                onValueChange={(value) => {
                  onTouchSchedule();
                  onChange({
                    ...draft,
                    schedule: draft.schedule.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, fromWeek: value ?? 0 } : item,
                    ),
                  });
                }}
              />
              <NumberField
                label="Hasta"
                value={milestone.toWeek}
                step={1}
                onValueChange={(value) => {
                  onTouchSchedule();
                  onChange({
                    ...draft,
                    schedule: draft.schedule.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, toWeek: value ?? 0 } : item,
                    ),
                  });
                }}
              />
              <button
                className="icon-btn"
                type="button"
                onClick={() => {
                  onTouchSchedule();
                  onChange({
                    ...draft,
                    schedule: draft.schedule.filter((_, itemIndex) => itemIndex !== index),
                  });
                }}
                aria-label="Eliminar hito"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="inline-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              onTouchSchedule();
              onChange({
                ...draft,
                schedule: [
                  ...draft.schedule,
                  { label: "Nuevo hito", fromWeek: 1, toWeek: input.weeks },
                ],
              });
            }}
          >
            <Plus size={15} /> Agregar hito
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              onTouchSchedule();
              onChange({ ...draft, schedule: defaultSchedule(input) });
            }}
          >
            Regenerar
          </button>
        </div>
      </Card>

      <Card>
        <div className="eyebrow">07 / CONDICIONES ESPECÍFICAS</div>
        <div className="editable-list">
          {draft.conditions.map((item, index) => (
            <div className="editable-row" key={index}>
              <Input
                value={item}
                onChange={(event) => changeCondition(index, event.target.value)}
              />
              <button
                className="icon-btn"
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    conditions: draft.conditions.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                aria-label="Eliminar condición"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() =>
            onChange({ ...draft, conditions: [...draft.conditions, "Nueva condición"] })
          }
        >
          <Plus size={15} /> Agregar condición
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => onChange({ ...draft, conditions: [...DEFAULT_CONDITIONS] })}
        >
          Restablecer condiciones
        </button>
      </Card>
    </div>
  );
}
