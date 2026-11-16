"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, CheckList, Card } from "@/components/ui";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import type { CalcCheck } from "@/lib/calculators/types";
import { calculatorSheet } from "@/lib/share/result-sheet";

export function CopyResultButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void copy()}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copiado" : "Copiar resultado"}
    </Button>
  );
}

export function CalculatorResult({
  eyebrow,
  main,
  details,
  checks,
  warnings,
  copyText,
}: {
  eyebrow: string;
  main: string;
  details: string;
  checks: CalcCheck[];
  warnings: string[];
  copyText: string;
}) {
  const sheet = calculatorSheet({ eyebrow, main, details, checks, warnings });
  return (
    <>
      <div className="calculator-result-bar" role="status" aria-live="polite">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <strong>{main}</strong>
          <small>{details}</small>
        </div>
        <span>{warnings.length ? "Revisar condiciones" : "Ver comprobaciones abajo"}</span>
      </div>
      <Card className="calculator-result">
        <div className="result-header">
          <div className="eyebrow">{eyebrow}</div>
          <CopyResultButton text={copyText} />
        </div>
        <strong className="result-main mono">{main}</strong>
        <p className="result-details">{details}</p>
        <CheckList checks={checks} />
        {warnings.map((warning) => (
          <p className="warning" key={warning}>
            {warning}
          </p>
        ))}
        <ShareResult sheet={sheet} diagramScope=".calculator-visual" />
        <SaveToProject sheet={sheet} />
      </Card>
    </>
  );
}

export function CalculatorLoading() {
  return (
    <div className="state-panel">
      <div className="state-spinner" />
      <p>Preparando calculadora…</p>
    </div>
  );
}
