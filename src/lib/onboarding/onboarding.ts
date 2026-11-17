/** First-run welcome: who uses the app, their favourite tools and how to install it. */

export type UserRole = "estudiante" | "profesional";
export type InstallPlatform = "ios" | "android" | "escritorio";

export interface QuickTool {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export interface OnboardingState {
  done: boolean;
  role: UserRole | null;
  tools: string[];
}

export const ONBOARDING_KEY = "trazzo-onboarding";
export const ONBOARDING_EVENT = "trazzo:onboarding";

/** Every tool that can be pinned to the home screen, in the default order. */
export const QUICK_TOOLS: readonly QuickTool[] = [
  {
    id: "medidas",
    title: "Medidas de bolsillo",
    detail: "Mobiliario y ambientes",
    href: "/medidas",
  },
  {
    id: "matriz",
    title: "Matriz de relaciones",
    detail: "Programa arquitectónico",
    href: "/matriz",
  },
  { id: "escaleras", title: "Escaleras", detail: "2cp + p", href: "/calculadoras?tab=escaleras" },
  { id: "rampas", title: "Rampas", detail: "Pendientes A.120", href: "/calculadoras?tab=rampas" },
  { id: "agua", title: "Agua", detail: "IS.010", href: "/calculadoras?tab=agua" },
  {
    id: "pozos",
    title: "Pozos de luz",
    detail: "A.020 · cuadro4",
    href: "/calculadoras?tab=pozos",
  },
  {
    id: "evacuacion",
    title: "Evacuación",
    detail: "Aforo y salidas",
    href: "/calculadoras?tab=evacuacion",
  },
  { id: "honorarios", title: "Honorarios", detail: "Cotiza y exporta PDF", href: "/honorarios" },
  {
    id: "materiales",
    title: "Materiales",
    detail: "Concreto, ladrillo, pintura",
    href: "/calculadoras?tab=materiales",
  },
  {
    id: "utilidades",
    title: "Utilidades de campo",
    detail: "Conversor, pendientes, áreas",
    href: "/calculadoras?tab=utilidades",
  },
  {
    id: "cabida",
    title: "Cabida de terreno",
    detail: "Área techada y pisos",
    href: "/calculadoras?tab=cabida",
  },
  { id: "aforo", title: "Aforo", detail: "Personas por uso", href: "/calculadoras?tab=aforo" },
  { id: "metrados", title: "Metrados", detail: "Partidas y compras", href: "/metrados" },
];

/** What the home screen shows when the user has not chosen anything. */
export const DEFAULT_TOOL_IDS: readonly string[] = QUICK_TOOLS.slice(0, 8).map((tool) => tool.id);

const ROLE_TOOLS: Record<UserRole, string[]> = {
  estudiante: ["medidas", "matriz", "escaleras", "rampas", "cabida", "aforo"],
  profesional: ["materiales", "metrados", "honorarios", "escaleras", "utilidades", "cabida"],
};

export const MAX_FAVORITE_TOOLS = 8;

export function suggestedTools(role: UserRole): string[] {
  return [...ROLE_TOOLS[role]];
}

/** Adds or removes a tool, keeping at most MAX_FAVORITE_TOOLS. */
export function toggleTool(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  if (selected.length >= MAX_FAVORITE_TOOLS) return [...selected];
  return [...selected, id];
}

/** Tools for the home grid: the chosen ones in the order chosen, or the defaults. */
export function resolveTools(ids: readonly string[]): QuickTool[] {
  const chosen = ids
    .map((id) => QUICK_TOOLS.find((tool) => tool.id === id))
    .filter((tool): tool is QuickTool => Boolean(tool));
  if (chosen.length > 0) return chosen;
  return DEFAULT_TOOL_IDS.map((id) => QUICK_TOOLS.find((tool) => tool.id === id)!);
}

export function parseOnboarding(raw: string | null | undefined): OnboardingState {
  const empty: OnboardingState = { done: false, role: null, tools: [] };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw) as Partial<OnboardingState>;
    const known = new Set(QUICK_TOOLS.map((tool) => tool.id));
    return {
      done: value.done === true,
      role: value.role === "estudiante" || value.role === "profesional" ? value.role : null,
      tools: Array.isArray(value.tools)
        ? value.tools.filter((id): id is string => typeof id === "string" && known.has(id))
        : [],
    };
  } catch {
    return empty;
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
