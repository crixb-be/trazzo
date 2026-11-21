import { it, expect } from "vitest";
import { deviceAnswer, calculatorForCard } from "./device";
import { RNE_CARDS } from "@/data/seed-rne";
it("responde sin red con cita y reconoce ausencia de fuentes", () => {
  expect(deviceAnswer("ancho de puerta accesible", RNE_CARDS)).toContain("A.120");
  expect(deviceAnswer("zzzzxyz", RNE_CARDS)).toContain("No encontré");
});
it("vincula herramientas pertinentes", () => {
  expect(calculatorForCard("escalera-paso-contrapaso")).toBe("escaleras");
  expect(calculatorForCard("nts113-escaleras-rampas")).toBe("salud-nts113");
  expect(calculatorForCard("a090-aforo")).toBe("comunales-a090");
  expect(calculatorForCard("a040-escaleras")).toBe("educacion");
  expect(calculatorForCard("minedu208-aula")).toBe("educacion");
  expect(calculatorForCard("otro")).toBeNull();
});
