"use client";

import { Check } from "lucide-react";
import {
  DEFAULT_TOOL_IDS,
  MAX_FAVORITE_TOOLS,
  OPEN_ONBOARDING_EVENT,
  QUICK_TOOLS,
  toggleTool,
} from "@/lib/onboarding/onboarding";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";

/** Lets the user change, after the welcome, which tools Home shows first. */
export function FavoriteToolsEditor() {
  const { state, save } = useOnboarding();
  if (!state) return null;
  const selected = state.tools.length > 0 ? state.tools : [...DEFAULT_TOOL_IDS];

  return (
    <>
      <p className="muted small">
        Se muestran primero en Inicio. Hasta {MAX_FAVORITE_TOOLS}, en el orden en que las marques.
      </p>
      <div className="onboarding-tools" role="group" aria-label="Herramientas en Inicio">
        {QUICK_TOOLS.map((tool) => {
          const active = selected.includes(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              className={active ? "active" : ""}
              aria-pressed={active}
              onClick={() => save({ ...state, tools: toggleTool(selected, tool.id) })}
            >
              {active && <Check size={14} aria-hidden="true" />}
              {tool.title}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="link-button"
        onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
      >
        Configurar accesos guiados
      </button>
    </>
  );
}
