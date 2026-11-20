"use client";

import { useEffect, useState } from "react";
import {
  applyDisplay,
  DISPLAY_EVENT,
  readDisplay,
  saveDisplay,
  type TextSize,
  type ThemeMode,
} from "./display";

/** La cabecera y la pantalla de cuenta comparten estas preferencias. */
export function useDisplay() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [textSize, setTextSizeState] = useState<TextSize>("normal");

  useEffect(() => {
    const sync = (event?: Event): void => {
      const current =
        event instanceof CustomEvent
          ? (event.detail as ReturnType<typeof readDisplay>)
          : readDisplay();
      setThemeState(current.theme);
      setTextSizeState(current.textSize);
      applyDisplay(current.theme, current.textSize);
    };
    sync();
    window.addEventListener(DISPLAY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DISPLAY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    theme,
    textSize,
    setTheme: (next: ThemeMode) => saveDisplay({ theme: next }),
    setTextSize: (next: TextSize) => saveDisplay({ textSize: next }),
  };
}
