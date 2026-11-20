/** Screen preferences kept on the device: theme and text size. */

export type ThemeMode = "dark" | "light";
export type TextSize = "normal" | "grande" | "muy-grande";

export const THEME_KEY = "trazzo-theme";
export const TEXT_SIZE_KEY = "trazzo-text";
export const DISPLAY_EVENT = "trazzo:display";

const LEGACY_LIGHT_THEME = "obra";
let transitionTimeout: number | undefined;

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "dark", label: "Oscuro", hint: "Interiores y poca luz" },
  { value: "light", label: "Claro", hint: "Oficina y luz normal" },
];

export const TEXT_SIZE_OPTIONS: ReadonlyArray<{ value: TextSize; label: string; scale: number }> = [
  { value: "normal", label: "Normal", scale: 1 },
  { value: "grande", label: "Grande", scale: 1.15 },
  { value: "muy-grande", label: "Muy grande", scale: 1.3 },
];

export function parseTheme(value: string | null | undefined): ThemeMode {
  return value === "light" || value === LEGACY_LIGHT_THEME ? "light" : "dark";
}

export function parseTextSize(value: string | null | undefined): TextSize {
  return value === "grande" || value === "muy-grande" ? value : "normal";
}

export function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export function themeLabel(theme: ThemeMode): string {
  return THEME_OPTIONS.find((option) => option.value === theme)?.label ?? "Oscuro";
}

/** Applies the preferences to <html>; the CSS reads the classes and attribute. */
export function applyDisplay(theme: ThemeMode, textSize: TextSize): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.remove(LEGACY_LIGHT_THEME);
  if (textSize === "normal") delete root.dataset.text;
  else root.dataset.text = textSize;
}

export function readDisplay(): { theme: ThemeMode; textSize: TextSize } {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const theme = parseTheme(storedTheme);
    const textSize = parseTextSize(localStorage.getItem(TEXT_SIZE_KEY));
    if (storedTheme === LEGACY_LIGHT_THEME) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // El tema claro sigue disponible aunque falle la escritura.
      }
    }
    return { theme, textSize };
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
    // La selección se aplica durante la visita aunque falle el almacenamiento.
  }
  const root = document.documentElement;
  if (root.classList.contains("dark") !== (theme === "dark")) {
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimeout);
    transitionTimeout = window.setTimeout(() => root.classList.remove("theme-transition"), 250);
  }
  applyDisplay(theme, textSize);
  window.dispatchEvent(new CustomEvent(DISPLAY_EVENT, { detail: { theme, textSize } }));
}

/**
 * Runs before the first paint so the page never flashes the wrong theme.
 * Kept as a string because it is inlined in <head>.
 */
export const NO_FLASH_DISPLAY_SCRIPT = [
  "var root = document.documentElement;",
  `root.classList.remove("${LEGACY_LIGHT_THEME}");`,
  "try {",
  `  var theme = localStorage.getItem("${THEME_KEY}");`,
  `  var text = localStorage.getItem("${TEXT_SIZE_KEY}");`,
  `  root.classList.toggle("dark", theme !== "light" && theme !== "${LEGACY_LIGHT_THEME}");`,
  '  if (text === "grande" || text === "muy-grande") root.dataset.text = text;',
  "} catch (_) {}",
].join("\n");
