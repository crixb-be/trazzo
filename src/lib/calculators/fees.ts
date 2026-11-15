export type FeeTypology =
  "vivienda-unifamiliar" | "multifamiliar" | "comercio" | "oficinas" | "remodelacion";

export const FEE_TYPOLOGIES: { value: FeeTypology; label: string }[] = [
  { value: "vivienda-unifamiliar", label: "Vivienda Unifamiliar" },
  { value: "multifamiliar", label: "Multifamiliar" },
  { value: "comercio", label: "Comercio / Local" },
  { value: "oficinas", label: "Oficinas" },
  { value: "remodelacion", label: "Remodelación / Interiorismo" },
];

export type LicenseModality = "A" | "B" | "C" | "D";
export type SupervisionMode = "visits" | "percent";
export type TaxMode = "igv" | "rxh";

export interface FeeRates {
  designPerM2: Record<FeeTypology, number>;
  floorFactorPerExtraFloor: number;
  maxFloorFactor: number;
  specialtyPerM2: { estructuras: number; sanitarias: number; electricas: number };
  renderUnit: number;
  virtualTour: number;
  licenseByModality: Record<LicenseModality, number>;
  supervisionVisit: number;
  supervisionPct: number;
  constructionCostPerM2: Record<FeeTypology, number>;
  executionPct: number;
}

export const DEFAULT_FEE_RATES: FeeRates = {
  designPerM2: {
    "vivienda-unifamiliar": 30,
    multifamiliar: 25,
    comercio: 28,
    oficinas: 28,
    remodelacion: 45,
  },
  floorFactorPerExtraFloor: 0.03,
  maxFloorFactor: 1.3,
  specialtyPerM2: { estructuras: 12, sanitarias: 6, electricas: 6 },
  renderUnit: 180,
  virtualTour: 1200,
  licenseByModality: { A: 800, B: 1500, C: 2500, D: 3500 },
  supervisionVisit: 250,
  supervisionPct: 0.03,
  constructionCostPerM2: {
    "vivienda-unifamiliar": 2200,
    multifamiliar: 2000,
    comercio: 2300,
    oficinas: 2500,
    remodelacion: 1200,
  },
  executionPct: 0.1,
};

export interface FeeScope {
  design: boolean;
  expediente: { enabled: boolean; estructuras: boolean; sanitarias: boolean; electricas: boolean };
  renders: { enabled: boolean; count: number; virtualTour: boolean };
  license: { enabled: boolean; modality: LicenseModality };
  supervision: { enabled: boolean; mode: SupervisionMode; visitsPerWeek: number; weeks: number };
  execution: { enabled: boolean };
}

export interface FeeQuoteInput {
  typology: FeeTypology;
  areaM2: number;
  floors: number;
  weeks: number;
  scope: FeeScope;
  constructionBudget: number | null;
  rates: FeeRates;
  tax: TaxMode;
}

export type FeeLineKey =
  "design" | "expediente" | "renders" | "license" | "supervision" | "execution";

export interface FeeLine {
  key: FeeLineKey;
  label: string;
  detail: string;
  amount: number;
}

export interface FeeQuoteResult {
  lines: FeeLine[];
  subtotal: number;
  taxLabel: string;
  taxAmount: number;
  total: number;
  retention: number;
  netReceived: number;
  constructionBudget: number;
  warnings: string[];
}

export function roundPen(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function money(value: number): string {
  return safeNumber(value).toFixed(2);
}

function typologyLabel(typology: FeeTypology): string {
  return FEE_TYPOLOGIES.find((item) => item.value === typology)?.label ?? typology;
}

export function defaultFeeScope(): FeeScope {
  return {
    design: true,
    expediente: { enabled: true, estructuras: true, sanitarias: true, electricas: true },
    renders: { enabled: false, count: 4, virtualTour: false },
    license: { enabled: false, modality: "B" },
    supervision: { enabled: false, mode: "visits", visitsPerWeek: 1, weeks: 8 },
    execution: { enabled: false },
  };
}

export function createDefaultFeeInput(): FeeQuoteInput {
  return {
    typology: "vivienda-unifamiliar",
    areaM2: 180,
    floors: 2,
    weeks: 8,
    scope: defaultFeeScope(),
    constructionBudget: null,
    rates: DEFAULT_FEE_RATES,
    tax: "igv",
  };
}

export function calculateFeeQuote(input: FeeQuoteInput): FeeQuoteResult {
  const warnings: string[] = [];
  const area = safeNumber(input.areaM2);
  const floors = Math.max(1, Math.floor(safeNumber(input.floors)));
  const weeks = Math.max(1, Math.floor(safeNumber(input.weeks)));
  const scope = input.scope;
  const rates = input.rates;
  const typology = input.typology;
  const floorFactor = Math.min(
    safeNumber(rates.maxFloorFactor),
    1 + safeNumber(rates.floorFactorPerExtraFloor) * (floors - 1),
  );

  if (!Number.isFinite(input.areaM2) || input.areaM2 <= 0) {
    warnings.push("Ingresa un área techada mayor a 0 m².");
  }
  if (!Number.isFinite(input.floors) || input.floors < 1) {
    warnings.push("Ingresa al menos 1 piso.");
  }
  if (!Number.isFinite(input.weeks) || input.weeks < 1) {
    warnings.push("Ingresa un plazo mayor a 0 semanas.");
  }

  const defaultBudget = area * safeNumber(rates.constructionCostPerM2[typology]);
  const constructionBudget =
    input.constructionBudget === null
      ? roundPen(defaultBudget)
      : roundPen(safeNumber(input.constructionBudget));
  if (
    input.constructionBudget !== null &&
    (!Number.isFinite(input.constructionBudget) || input.constructionBudget < 0)
  ) {
    warnings.push("El presupuesto de obra no puede ser negativo.");
  }

  const lines: FeeLine[] = [];
  const addLine = (line: FeeLine, keep = false): void => {
    if (line.amount > 0 || keep) lines.push({ ...line, amount: roundPen(line.amount) });
  };

  if (scope.design) {
    const rate = safeNumber(rates.designPerM2[typology]);
    addLine(
      {
        key: "design",
        label: "Diseño arquitectónico",
        detail:
          area.toFixed(2) +
          " m² × S/ " +
          money(rate) +
          " × factor " +
          floorFactor.toFixed(2) +
          " (" +
          floors +
          " pisos)",
        amount: area * rate * floorFactor,
      },
      area === 0,
    );
  }

  if (scope.expediente.enabled) {
    const selected = [
      scope.expediente.estructuras ? ["Estructuras", rates.specialtyPerM2.estructuras] : null,
      scope.expediente.sanitarias ? ["Inst. Sanitarias", rates.specialtyPerM2.sanitarias] : null,
      scope.expediente.electricas ? ["Inst. Eléctricas", rates.specialtyPerM2.electricas] : null,
    ].filter((item): item is [string, number] => item !== null);
    if (selected.length === 0)
      warnings.push("Selecciona al menos una especialidad para el expediente.");
    addLine(
      {
        key: "expediente",
        label: "Expediente de especialidades",
        detail: selected.map(([label]) => label).join(", ") || "Sin especialidades seleccionadas",
        amount: area * selected.reduce((sum, [, rate]) => sum + safeNumber(rate), 0),
      },
      selected.length === 0,
    );
  }

  if (scope.renders.enabled) {
    const count = Math.max(0, Math.floor(safeNumber(scope.renders.count)));
    if (!Number.isFinite(scope.renders.count) || scope.renders.count < 0)
      warnings.push("El número de renders no puede ser negativo.");
    const amount =
      count * safeNumber(rates.renderUnit) +
      (scope.renders.virtualTour ? safeNumber(rates.virtualTour) : 0);
    addLine(
      {
        key: "renders",
        label: "Renders y recorrido virtual",
        detail:
          count +
          " renders × S/ " +
          money(rates.renderUnit) +
          (scope.renders.virtualTour ? " + recorrido virtual" : ""),
        amount,
      },
      !count &&
        !scope.renders.virtualTour &&
        (!Number.isFinite(scope.renders.count) || scope.renders.count < 0),
    );
  }

  if (scope.license.enabled) {
    const modality = scope.license.modality;
    addLine({
      key: "license",
      label: "Gestión de licencia",
      detail: "Modalidad " + modality + " · no incluye tasas municipales",
      amount: safeNumber(rates.licenseByModality[modality]),
    });
  }

  if (scope.supervision.enabled) {
    const supervisionWeeks = Math.max(0, Math.floor(safeNumber(scope.supervision.weeks)));
    const visits = Math.max(0, Math.floor(safeNumber(scope.supervision.visitsPerWeek)));
    const amount =
      scope.supervision.mode === "visits"
        ? visits * supervisionWeeks * safeNumber(rates.supervisionVisit)
        : constructionBudget * safeNumber(rates.supervisionPct);
    addLine({
      key: "supervision",
      label: "Supervisión de obra",
      detail:
        scope.supervision.mode === "visits"
          ? visits +
            " visitas/semana × " +
            supervisionWeeks +
            " semanas × S/ " +
            money(rates.supervisionVisit)
          : "Presupuesto S/ " +
            money(constructionBudget) +
            " × " +
            (safeNumber(rates.supervisionPct) * 100).toFixed(2) +
            "%",
      amount,
    });
  }

  if (scope.execution.enabled) {
    addLine({
      key: "execution",
      label: "Dirección técnica y administración",
      detail:
        "Presupuesto S/ " +
        money(constructionBudget) +
        " × " +
        (safeNumber(rates.executionPct) * 100).toFixed(2) +
        "%",
      amount: constructionBudget * safeNumber(rates.executionPct),
    });
  }

  const subtotal = roundPen(lines.reduce((sum, line) => sum + line.amount, 0));
  const tax = input.tax === "igv" ? roundPen(subtotal * 0.18) : 0;
  const total = roundPen(subtotal + tax);
  const retention = input.tax === "rxh" && subtotal > 1500 ? roundPen(subtotal * 0.08) : 0;

  return {
    lines,
    subtotal,
    taxLabel: input.tax === "igv" ? "IGV 18%" : "Recibo por Honorarios",
    taxAmount: tax,
    total,
    retention,
    netReceived: roundPen(total - retention),
    constructionBudget,
    warnings,
  };
}

export interface PaymentInstallment {
  label: string;
  pct: number;
}

export interface PaymentPreset {
  id: "50-50" | "40-30-30" | "custom";
  label: string;
  installments: PaymentInstallment[];
}

export const PAYMENT_PRESETS: PaymentPreset[] = [
  {
    id: "50-50",
    label: "50% inicio / 50% entrega",
    installments: [
      { label: "Inicio", pct: 50 },
      { label: "Entrega", pct: 50 },
    ],
  },
  {
    id: "40-30-30",
    label: "40% firma / 30% anteproyecto / 30% expediente final",
    installments: [
      { label: "Firma", pct: 40 },
      { label: "Anteproyecto", pct: 30 },
      { label: "Expediente final", pct: 30 },
    ],
  },
  {
    id: "custom",
    label: "Personalizado",
    installments: [
      { label: "Inicio", pct: 50 },
      { label: "Entrega", pct: 50 },
    ],
  },
];

export function paymentAmounts(total: number, installments: PaymentInstallment[]): number[] {
  const safeTotal = roundPen(safeNumber(total));
  if (installments.length === 0) return [];
  const amounts = installments.map((installment) =>
    roundPen((safeTotal * safeNumber(installment.pct)) / 100),
  );
  const beforeLast = amounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0);
  amounts[amounts.length - 1] = roundPen(safeTotal - beforeLast);
  return amounts;
}

export function validatePaymentPlan(installments: PaymentInstallment[]): {
  ok: boolean;
  sum: number;
  message: string | null;
} {
  const sum = installments.reduce((total, installment) => total + installment.pct, 0);
  const ok =
    installments.length > 0 &&
    installments.every((installment) => Number.isFinite(installment.pct) && installment.pct > 0) &&
    Math.abs(sum - 100) < 0.01;
  return {
    ok,
    sum: roundPen(sum),
    message: ok ? null : "La suma debe ser 100% y cada cuota debe ser mayor a 0%.",
  };
}

export interface Milestone {
  label: string;
  fromWeek: number;
  toWeek: number;
}

export function defaultSchedule(input: FeeQuoteInput): Milestone[] {
  const weeks = Math.max(1, Math.floor(safeNumber(input.weeks)));
  const phases: Array<{ label: string; weight: number }> = [];
  if (input.scope.design) phases.push({ label: "Anteproyecto", weight: 0.3 });
  if (input.scope.expediente.enabled) phases.push({ label: "Especialidades", weight: 0.4 });
  if (input.scope.renders.enabled) phases.push({ label: "Renders", weight: 0.15 });
  if (input.scope.license.enabled) phases.push({ label: "Licencia municipal", weight: 0.15 });
  if (input.scope.supervision.enabled || input.scope.execution.enabled)
    phases.push({ label: "Durante la obra", weight: 0.2 });
  if (phases.length === 0) phases.push({ label: "Entrega", weight: 1 });

  const scheduledPhases = phases.slice(0, weeks);
  const spans = scheduledPhases.map((phase) =>
    Math.max(
      1,
      Math.round(
        (weeks * phase.weight) / scheduledPhases.reduce((sum, item) => sum + item.weight, 0),
      ),
    ),
  );
  let difference = weeks - spans.reduce((sum, span) => sum + span, 0);
  while (difference !== 0) {
    const index = difference > 0 ? spans.length - 1 : spans.findIndex((span) => span > 1);
    if (index < 0) break;
    spans[index] += difference > 0 ? 1 : -1;
    difference += difference > 0 ? -1 : 1;
  }

  let cursor = 1;
  return scheduledPhases.map((phase, index) => {
    const fromWeek = cursor;
    const toWeek = Math.min(weeks, cursor + spans[index] - 1);
    cursor = toWeek + 1;
    return { label: phase.label, fromWeek, toWeek };
  });
}

/** "3–5" for a span, "6" for a single week. */
export function formatWeekRange(milestone: Milestone): string {
  return milestone.fromWeek === milestone.toWeek
    ? String(milestone.fromWeek)
    : milestone.fromWeek + "–" + milestone.toWeek;
}

export interface DeliverableGroup {
  group: string;
  items: string[];
}

/** Default deliverables per enabled scope; the single source for lists and PDF grouping. */
export function defaultDeliverableGroups(input: FeeQuoteInput): DeliverableGroup[] {
  const { scope } = input;
  const groups: DeliverableGroup[] = [];
  if (scope.design)
    groups.push({
      group: "Diseño arquitectónico",
      items: [
        "Planos de distribución, cortes y elevaciones",
        "Memoria descriptiva",
        "Archivo editable (DWG/RVT)",
      ],
    });
  if (scope.expediente.enabled) {
    if (scope.expediente.estructuras)
      groups.push({
        group: "Expediente técnico — Estructuras",
        items: ["Planos y memoria de estructuras"],
      });
    if (scope.expediente.sanitarias)
      groups.push({
        group: "Expediente técnico — Inst. Sanitarias",
        items: ["Planos y memoria de instalaciones sanitarias"],
      });
    if (scope.expediente.electricas)
      groups.push({
        group: "Expediente técnico — Inst. Eléctricas",
        items: ["Planos y memoria de instalaciones eléctricas"],
      });
  }
  if (scope.renders.enabled)
    groups.push({
      group: "Modelado 3D y renders",
      items: [
        scope.renders.count + " renders HD",
        ...(scope.renders.virtualTour ? ["Recorrido virtual"] : []),
      ],
    });
  if (scope.license.enabled)
    groups.push({
      group: "Licencia municipal",
      items: ["Expediente para licencia municipal (Modalidad " + scope.license.modality + ")"],
    });
  if (scope.supervision.enabled)
    groups.push({ group: "Supervisión de obra", items: ["Informes de supervisión por visita"] });
  if (scope.execution.enabled)
    groups.push({ group: "Dirección técnica", items: ["Informes de avance y valorizaciones"] });
  return groups;
}

export function defaultDeliverables(input: FeeQuoteInput): string[] {
  return defaultDeliverableGroups(input).flatMap((group) => group.items);
}

/**
 * Groups the (possibly edited) deliverables by specialty: items that match a default
 * deliverable keep its group, anything the architect wrote goes to "Adicionales".
 */
export function groupDeliverables(
  input: FeeQuoteInput,
  deliverables: string[],
): DeliverableGroup[] {
  const defaults = defaultDeliverableGroups(input);
  const groupOf = new Map<string, string>();
  for (const { group, items } of defaults) for (const item of items) groupOf.set(item, group);

  const order = [...defaults.map((group) => group.group), "Adicionales"];
  const buckets = new Map<string, string[]>(order.map((group) => [group, []]));
  for (const item of deliverables) {
    buckets.get(groupOf.get(item) ?? "Adicionales")?.push(item);
  }
  return order
    .map((group) => ({ group, items: buckets.get(group) ?? [] }))
    .filter((group) => group.items.length > 0);
}

export const DEFAULT_CONDITIONS: string[] = [
  "Incluye hasta 2 rondas de modificaciones en etapa de anteproyecto.",
  "No incluye tasas municipales, derechos de revisión CAP ni estudios de mecánica de suelos.",
  "Vigencia de la cotización: 15 días calendario.",
  "Los plazos corren a partir del pago inicial y la entrega de información completa por el cliente.",
  "Cambios de alcance posteriores se cotizan por separado.",
];

export function formatPen(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "-" : "";
  const fixed = Math.abs(safe).toFixed(2);
  const [whole, decimals] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "S/ " + sign + grouped + "." + decimals;
}

export function formatQuoteCode(year: number, sequence: number): string {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 0;
  const safeSequence = Math.max(0, Number.isFinite(sequence) ? Math.trunc(sequence) : 0);
  return "COT-" + safeYear + "-" + String(safeSequence).padStart(3, "0");
}

export { typologyLabel };
