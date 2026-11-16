"use client";

import { Check, GraduationCap, HardHat, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  MAX_FAVORITE_TOOLS,
  QUICK_TOOLS,
  suggestedTools,
  toggleTool,
  type UserRole,
} from "@/lib/onboarding/onboarding";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { InstallGuide } from "./InstallGuide";

const STEPS = ["Tu perfil", "Tus herramientas", "Instalar"];

/** Three-step welcome shown once, the first time the app opens on a device. */
export function Onboarding() {
  const { state, save } = useOnboarding();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const open = state !== null && !state.done;

  // Reopened from Account: start again from the first step.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open, step]);

  if (!open) return null;

  function finish(): void {
    save({ done: true, role, tools });
  }

  function chooseRole(next: UserRole): void {
    setRole(next);
    setTools(suggestedTools(next));
    setStep(1);
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

        {step === 0 && (
          <>
            <h2 id="onboarding-title" ref={heading} tabIndex={-1}>
              Bienvenido a TRAZZO
            </h2>
            <p className="onboarding-note">
              <WifiOff size={16} aria-hidden="true" />
              <span>
                Funciona sin cuenta y sin señal: normas, calculadoras y metrados se guardan en este
                teléfono.
              </span>
            </p>
            <p className="muted small">¿Cómo usarás la app? Solo ordena tus accesos.</p>
            <div className="onboarding-roles">
              <button type="button" onClick={() => chooseRole("estudiante")}>
                <GraduationCap size={22} aria-hidden="true" />
                <strong>Estudiante</strong>
                <small>Taller, programa y anteproyecto</small>
              </button>
              <button type="button" onClick={() => chooseRole("profesional")}>
                <HardHat size={22} aria-hidden="true" />
                <strong>Profesional</strong>
                <small>Obra, metrados y honorarios</small>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 id="onboarding-title" ref={heading} tabIndex={-1}>
              Elige tus herramientas
            </h2>
            <p className="muted small">
              Aparecen primero en Inicio. Hasta {MAX_FAVORITE_TOOLS}; puedes cambiarlas en Cuenta.
            </p>
            <div className="onboarding-tools" role="group" aria-label="Herramientas favoritas">
              {QUICK_TOOLS.map((tool) => {
                const selected = tools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={selected ? "active" : ""}
                    aria-pressed={selected}
                    onClick={() => setTools((current) => toggleTool(current, tool.id))}
                  >
                    {selected && <Check size={14} aria-hidden="true" />}
                    {tool.title}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 id="onboarding-title" ref={heading} tabIndex={-1}>
              Llévala en tu pantalla de inicio
            </h2>
            <p className="muted small">
              Instalada abre a pantalla completa y sin conexión. Es opcional.
            </p>
            <InstallGuide />
          </>
        )}

        <div className="onboarding-actions">
          {step === 0 ? (
            <button type="button" className="btn btn-secondary" onClick={finish}>
              Omitir
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              Atrás
            </button>
          )}
          {step === 1 && (
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              Continuar
            </button>
          )}
          {step === 2 && (
            <button type="button" className="btn btn-primary" onClick={finish}>
              Empezar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
