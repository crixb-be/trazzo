import { Capacitor } from "@capacitor/core";

export interface NativePlatformApi {
  isNativePlatform(): boolean;
}

/**
 * Keeps the store-policy decision in one place and makes it injectable in
 * tests. Capacitor returns false for a normal browser and a PWA.
 */
export function detectNativePlatform(api: NativePlatformApi = Capacitor): boolean {
  return api.isNativePlatform();
}

