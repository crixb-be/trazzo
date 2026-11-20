import type { CapacitorConfig } from "@capacitor/cli";

/** Folder with the two static pages the native shell carries on board. */
export const NATIVE_WEB_DIR = "capacitor/www";

/**
 * TRAZZO needs its server (assistant, payments, account), so the native app is
 * a shell that loads the deployed site. `webDir` holds only a setup notice and
 * the page shown when the site cannot be reached on first launch; after that
 * the service worker keeps the app working without signal.
 */
export function buildCapacitorConfig(serverUrl: string | undefined): CapacitorConfig {
  const base: CapacitorConfig = {
    appId: "pe.trazzo.app",
    appName: "TRAZZO",
    webDir: NATIVE_WEB_DIR,
    backgroundColor: "#121316",
    // Android 15 draws apps edge to edge (targetSdk 35): without this margin the
    // status bar sits on top of TRAZZO's header and cuts the page titles.
    android: { adjustMarginsForEdgeToEdge: "auto" },
  };
  const url = serverUrl?.trim();
  if (!url) return base;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("CAPACITOR_SERVER_URL no es una URL válida: " + url);
  }
  const local = ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) {
    throw new Error("CAPACITOR_SERVER_URL debe usar https fuera de pruebas locales.");
  }
  return {
    ...base,
    server: {
      url: parsed.origin,
      // Plain http is only for a dev server on the same machine or emulator.
      cleartext: parsed.protocol === "http:",
      errorPath: "offline.html",
    },
  };
}
