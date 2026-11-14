import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pe.trazzo.app",
  appName: "TRAZZO",
  webDir: ".next",
  ...(process.env.CAPACITOR_SERVER_URL
    ? { server: { url: process.env.CAPACITOR_SERVER_URL, cleartext: true } }
    : {}),
};
export default config;
