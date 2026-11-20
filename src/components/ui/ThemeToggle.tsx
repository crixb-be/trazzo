"use client";

import { Moon, Sun } from "lucide-react";
import { nextTheme, themeLabel } from "@/lib/ui/display";
import { useDisplay } from "@/lib/ui/use-display";

export function ThemeToggle() {
  const { theme, setTheme } = useDisplay();
  const upcoming = nextTheme(theme);

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={() => setTheme(upcoming)}
      aria-label={"Tema " + themeLabel(theme) + ". Cambiar a " + themeLabel(upcoming)}
      title={"Tema: " + themeLabel(theme)}
    >
      {theme === "dark" ? (
        <Moon size={17} aria-hidden="true" />
      ) : (
        <Sun size={17} aria-hidden="true" />
      )}
    </button>
  );
}
