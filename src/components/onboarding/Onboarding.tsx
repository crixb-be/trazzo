"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ONBOARDING_KEY, OPEN_ONBOARDING_EVENT } from "@/lib/onboarding/onboarding";
import { InstallGuide } from "./InstallGuide";

const STEPS = ["Bienvenida", "Instalar"] as const;

export function OnboardingButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
    >
      Ver bienvenida
    </button>
  );
}

export function Onboarding() {
  const [step, setStep] = useState<0 | 1 | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setStep(0);
    };
    window.addEventListener(OPEN_ONBOARDING_EVENT, show);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, show);
  }, []);

  useEffect(() => {
    if (step !== null) heading.current?.focus();
  }, [step]);

  if (step === null) return null;

  function finish(): void {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ done: true }));
    } catch {
      // The dialog can still close if storage is blocked.
    }
    setStep(null);
    opener.current?.focus();
  }

  return (
    <div className="modal-backdrop onboarding-backdrop" role="presentation">
      <div
        className="modal onboarding"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") finish();
        }}
      >
        <div className="onboarding-progress" aria-hidden="true">
          {STEPS.map((label, index) => (
            <span key={label} className={index <= step ? "active" : ""} />
          ))}
        </div>
        <p className="eyebrow">
          PASO {step + 1} DE {STEPS.length} · {STEPS[step].toUpperCase()}
        </p>
        <h2 id="onboarding-title" ref={heading} tabIndex={-1}>
          {step === 0 ? "Bienvenido a TRAZZO" : "Llévala en tu pantalla de inicio"}
        </h2>

        {step === 0 ? (
          <p className="onboarding-note">
            <WifiOff size={16} aria-hidden="true" />
            <span>
              Funciona sin cuenta y sin señal. Consulta normas, haz cálculos y guarda tus metrados
              en este dispositivo.
            </span>
          </p>
        ) : (
          <>
            <p className="muted small">
              Si la instalas, podrás abrirla a pantalla completa desde el ícono de TRAZZO.
            </p>
            <InstallGuide />
          </>
        )}

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={step === 0 ? finish : () => setStep(0)}
          >
            {step === 0 ? "Omitir" : "Atrás"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={step === 0 ? () => setStep(1) : finish}
          >
            {step === 0 ? "Continuar" : "Empezar"}
          </button>
        </div>
      </div>
    </div>
  );
}
