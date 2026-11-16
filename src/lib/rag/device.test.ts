import { it, expect } from "vitest";
import { deviceAnswer, calculatorForCard } from "./device";
import { RNE_CARDS } from "@/data/seed-rne";
it("responde sin red con cita y reconoce ausencia de fuentes", () => {
  expect(deviceAnswer("ancho de puerta accesible", RNE_CARDS)).toContain("A.120");
  expect(deviceAnswer("zzzzxyz", RNE_CARDS)).toContain("No encontré");
});
it("vincula herramientas pertinentes", () => {
  expect(calculatorForCard("escalera-paso-contrapaso")).toBe("escaleras");
  expect(calculatorForCard("otro")).toBeNull();
});
