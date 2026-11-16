/** Screen preferences kept on the device: theme and text size. */

export type ThemeMode = "dark" | "light" | "obra";
export type TextSize = "normal" | "grande" | "muy-grande";

export const THEME_KEY = "trazzo-theme";
export const TEXT_SIZE_KEY = "trazzo-text";
export const DISPLAY_EVENT = "trazzo:display";

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "dark", label: "Oscuro", hint: "Interiores y poca luz" },
  { value: "light", label: "Claro", hint: "Oficina y luz normal" },
  { value: "obra", label: "Obra", hint: "Alto contraste para sol directo" },
];

export const TEXT_SIZE_OPTIONS: ReadonlyArray<{ value: TextSize; label: string; scale: number }> = [
  { value: "normal", label: "Normal", scale: 1 },
  { value: "grande", label: "Grande", scale: 1.15 },
  { value: "muy-grande", label: "Muy grande", scale: 1.3 },
];

export function parseTheme(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "obra" ? value : "dark";
}

export function parseTextSize(value: string | null | undefined): TextSize {
  return value === "grande" || value === "muy-grande" ? value : "normal";
}

export function nextTheme(current: ThemeMode): ThemeMode {
  const order: ThemeMode[] = ["dark", "light", "obra"];
  return order[(order.indexOf(current) + 1) % order.length];
}

export function themeLabel(theme: ThemeMode): string {
  return THEME_OPTIONS.find((option) => option.value === theme)?.label ?? "Oscuro";
}

/** Applies the preferences to <html>; the CSS reads the classes and attribute. */
export function applyDisplay(theme: ThemeMode, textSize: TextSize): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("obra", theme === "obra");
  if (textSize === "normal") delete root.dataset.text;
  else root.dataset.text = textSize;
}

export function readDisplay(): { theme: ThemeMode; textSize: TextSize } {
  try {
    return {
      theme: parseTheme(localStorage.getItem(THEME_KEY)),
      textSize: parseTextSize(localStorage.getItem(TEXT_SIZE_KEY)),
    };
  } catch {
    return { theme: "dark", textSize: "normal" };
  }
}

export function saveDisplay(next: { theme?: ThemeMode; textSize?: TextSize }): void {
  const current = readDisplay();
  const theme = next.theme ?? current.theme;
  const textSize = next.textSize ?? current.textSize;
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(TEXT_SIZE_KEY, textSize);
  } catch {
    // Private mode: the choice still applies until the page closes.
  }
  applyDisplay(theme, textSize);
  window.dispatchEvent(new CustomEvent(DISPLAY_EVENT, { detail: { theme, textSize } }));
}

/**
 * Runs before the first paint so the page never flashes the wrong theme.
 * Kept as a string because it is inlined in <head>.
 */
export const NO_FLASH_DISPLAY_SCRIPT = [
  "try {",
  `  var theme = localStorage.getItem("${THEME_KEY}");`,
  `  var text = localStorage.getItem("${TEXT_SIZE_KEY}");`,
  "  var root = document.documentElement;",
  '  root.classList.toggle("dark", theme !== "light" && theme !== "obra");',
  '  root.classList.toggle("obra", theme === "obra");',
  '  if (text === "grande" || text === "muy-grande") root.dataset.text = text;',
  "} catch (_) {}",
].join("\n");
