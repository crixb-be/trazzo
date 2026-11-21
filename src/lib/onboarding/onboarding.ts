export type InstallPlatform = "ios" | "android" | "escritorio";

export const ONBOARDING_KEY = "trazzo-onboarding";
export const OPEN_ONBOARDING_EVENT = "trazzo:open-onboarding";

export function parseOnboarding(raw: string | null | undefined): { done: boolean } {
  try {
    const value: { done?: unknown } | null = raw ? JSON.parse(raw) : null;
    return { done: value?.done === true };
  } catch {
    return { done: false };
  }
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  // iPadOS reports itself as a Mac; the touch screen tells them apart.
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "escritorio";
}

export const INSTALL_STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: "iPhone y iPad (Safari)",
    steps: [
      "Abre TRAZZO en Safari.",
      "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
      "Elige «Agregar a inicio» o «Añadir a pantalla de inicio».",
      "Toca «Agregar». TRAZZO queda como una app más.",
    ],
  },
  android: {
    title: "Android (Chrome)",
    steps: [
      "Abre TRAZZO en Chrome.",
      "Toca el menú de tres puntos, arriba a la derecha.",
      "Elige «Instalar app» o «Agregar a la pantalla principal».",
      "Confirma con «Instalar».",
    ],
  },
  escritorio: {
    title: "Computadora (Chrome o Edge)",
    steps: [
      "Abre TRAZZO en Chrome o Edge.",
      "Haz clic en el ícono de instalar, al final de la barra de direcciones.",
      "Confirma con «Instalar».",
    ],
  },
};
