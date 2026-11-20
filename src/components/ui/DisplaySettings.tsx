"use client";

import { TEXT_SIZE_OPTIONS, THEME_OPTIONS } from "@/lib/ui/display";
import { useDisplay } from "@/lib/ui/use-display";

/** El tema y el tama?o de letra se guardan en este dispositivo. */
export function DisplaySettings() {
  const { theme, textSize, setTheme, setTextSize } = useDisplay();

  return (
    <div className="display-settings">
      <fieldset>
        <legend>Tema</legend>
        <div className="segmented" role="radiogroup" aria-label="Tema">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              className={theme === option.value ? "active" : ""}
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          {THEME_OPTIONS.find((option) => option.value === theme)?.hint}
        </p>
      </fieldset>
      <fieldset>
        <legend>Tamaño de letra</legend>
        <div className="segmented" role="radiogroup" aria-label="Tamaño de letra">
          {TEXT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={textSize === option.value}
              className={textSize === option.value ? "active" : ""}
              onClick={() => setTextSize(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="display-sample">
          Paso mínimo <strong className="mono">0.25 m</strong>
        </p>
      </fieldset>
    </div>
  );
}
