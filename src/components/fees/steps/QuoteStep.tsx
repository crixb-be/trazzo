import type { ReactNode } from "react";
export const QUOTE_STEPS = [
  "Proyecto",
  "Alcance",
  "Tarifas",
  "Entregables",
  "Pago",
  "Cronograma",
  "Condiciones",
];
export function QuoteStep({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return active ? <section aria-label={"Paso: " + label}>{children}</section> : null;
}
export function QuoteStepsNav({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Pasos de honorarios" className="quote-steps">
      {QUOTE_STEPS.map((label, i) => (
        <button
          type="button"
          className="btn"
          aria-current={step === i ? "step" : undefined}
          key={label}
          onClick={() => onSelect(i)}
        >
          {i + 1}. {label}
        </button>
      ))}
    </nav>
  );
}
