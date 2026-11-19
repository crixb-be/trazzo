import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCapacitorConfig, NATIVE_WEB_DIR } from "./capacitor-config";

describe("capacitor config", () => {
  it("points webDir at a real static folder with its two pages", () => {
    const config = buildCapacitorConfig(undefined);
    expect(config.webDir).toBe(NATIVE_WEB_DIR);
    expect(config.server).toBeUndefined();
    expect(existsSync(NATIVE_WEB_DIR + "/index.html")).toBe(true);
    expect(existsSync(NATIVE_WEB_DIR + "/offline.html")).toBe(true);
  });

  it("deja espacio para la barra de estado en Android 15 (borde a borde)", () => {
    expect(buildCapacitorConfig(undefined).android?.adjustMarginsForEdgeToEdge).toBe("auto");
    expect(buildCapacitorConfig("https://trazzo.example").android?.adjustMarginsForEdgeToEdge).toBe(
      "auto",
    );
  });

  it("loads the deployed site over https with an offline page", () => {
    const config = buildCapacitorConfig("https://trazzo.example/app?x=1 ");
    expect(config.server).toEqual({
      url: "https://trazzo.example",
      cleartext: false,
      errorPath: "offline.html",
    });
  });

  it("allows plain http only for local development", () => {
    expect(buildCapacitorConfig("http://10.0.2.2:3000").server?.cleartext).toBe(true);
    expect(() => buildCapacitorConfig("http://trazzo.example")).toThrow(/https/);
    expect(() => buildCapacitorConfig("trazzo")).toThrow(/válida/);
  });
});
