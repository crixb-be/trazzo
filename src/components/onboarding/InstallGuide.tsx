"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { detectPlatform, INSTALL_STEPS, type InstallPlatform } from "@/lib/onboarding/onboarding";
import { useInstallPrompt } from "@/lib/onboarding/use-onboarding";

const PLATFORMS: Array<{ value: InstallPlatform; label: string }> = [
  { value: "ios", label: "iPhone" },
  { value: "android", label: "Android" },
  { value: "escritorio", label: "Computadora" },
];

/** Step-by-step install instructions, opening on the visitor's own device. */
export function InstallGuide() {
  const [platform, setPlatform] = useState<InstallPlatform>("android");
  const { installed, canPrompt, install } = useInstallPrompt();

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
  }, []);

  if (installed) {
    return (
      <p className="install-done" role="status">
        TRAZO ya está instalada en este dispositivo.
      </p>
    );
  }

  const guide = INSTALL_STEPS[platform];
  return (
    <div className="install-guide">
      {canPrompt && (
        <button type="button" className="btn btn-primary" onClick={() => void install()}>
          <Download size={15} aria-hidden="true" /> Instalar ahora
        </button>
      )}
      <div className="segmented" role="radiogroup" aria-label="Dispositivo">
        {PLATFORMS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={platform === option.value}
            className={platform === option.value ? "active" : ""}
            onClick={() => setPlatform(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <strong className="install-title">{guide.title}</strong>
      <ol className="install-steps">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
