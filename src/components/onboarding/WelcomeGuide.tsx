"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ONBOARDING_KEY, parseOnboarding } from "@/lib/onboarding/onboarding";

const SEEN_KEY = "trazzo_onboarding_v1_seen";
const OPEN_EVENT = "trazzo:open-welcome-guide";

const steps = [
  {
    title: "Calculadoras normativas RNE",
    description:
      "Abre Calculadoras, elige un módulo e ingresa las medidas de tu caso. Revisa las referencias del RNE para arquitectura (A.010 y A.120) e instalaciones sanitarias (IS.010). Para estructuras, consulta la norma de diseño sismorresistente E.030. En Normativa puedes cambiar entre Fichas RNE y Medidas de bolsillo.",
  },
  {
    title: "Trabajo offline y modo Claro/Oscuro",
    description:
      "Alterna entre Claro y Oscuro desde la cabecera o elige tu tema en Cuenta → Pantalla. Tu trabajo se guarda en el dispositivo y puedes seguir calculando y consultando las fichas locales sin señal.",
  },
  {
    title: "Proyectos, respaldo y sincronización",
    description:
      "Crea tu obra en Proyectos. Pulsa «Guardar en proyecto» para conservar un resultado y usa «Compartir» para exportarlo. En Cuenta puedes descargar una copia de seguridad. Inicia sesión para sincronizar en la nube los datos que admiten respaldo cuando vuelva la conexión.",
  },
] as const;

export function WelcomeGuideButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Ver guía rápida
    </Button>
  );
}

export function WelcomeGuide() {
  const [step, setStep] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusHeading = useRef(false);

  useEffect(() => {
    const open = () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setStep(0);
      if (heading.current) heading.current.focus();
      else focusHeading.current = true;
    };
    window.addEventListener(OPEN_EVENT, open);
    try {
      const automated =
        navigator.webdriver || new URLSearchParams(location.search).get("e2e") === "1";
      const seen = localStorage.getItem(SEEN_KEY) === "1";
      const existingUser = parseOnboarding(localStorage.getItem(ONBOARDING_KEY)).done;
      if (!automated && !seen && !existingUser) setStep(0);
    } catch {
      // With storage blocked, the guide stays available through the manual button.
    }
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    heading.current?.focus();
  }, [step]);

  function goTo(next: number) {
    focusHeading.current = true;
    setStep(next);
  }

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // The guide still closes for the current visit.
    }
    setStep(null);
    opener.current?.focus();
    opener.current = null;
  }

  if (step === null) return null;
  const lastStep = step === steps.length - 1;

  return (
    <Card
      className="welcome-guide"
      aria-labelledby="welcome-guide-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
      }}
    >
      <div className="welcome-guide-header">
        <p className="eyebrow">
          Guía rápida · Paso {step + 1} de {steps.length}
        </p>
        <Button variant="ghost" size="sm" aria-label="Cerrar guía" onClick={dismiss}>
          <X size={18} aria-hidden="true" />
        </Button>
      </div>
      <h2 id="welcome-guide-title" ref={heading} tabIndex={-1}>
        {steps[step].title}
      </h2>
      <p>{steps[step].description}</p>
      <div className="inline-actions">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Saltar guía
        </Button>
        {step > 0 && (
          <Button size="sm" onClick={() => goTo(step - 1)}>
            Atrás
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={lastStep ? dismiss : () => goTo(step + 1)}>
          {lastStep ? "Empezar" : "Siguiente"}
        </Button>
      </div>
    </Card>
  );
}
