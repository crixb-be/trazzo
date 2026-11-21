import { describe, expect, it } from "vitest";
import {
  NTS113_AREAS,
  NTS113_CARDS,
  circulationShare,
  integratedStairWidth,
} from "@/data/norms/nts113";
import {
  checkHealthArea,
  checkHealthCorridor,
  checkHealthDoor,
  checkHealthHeight,
  checkHealthStair,
  healthMinimumHeight,
} from "./nts113";

describe("NTS 113 · áreas mínimas (Cuadros N° 1, 4 y 5)", () => {
  it("usa los valores oficiales, incluida la modificación de la RM 999-2016", () => {
    const area = (code: string) => NTS113_AREAS.find((a) => a.code === code)?.area;
    expect(area("MED1")).toBe(13.5);
    expect(area("MED2e")).toBe(17);
    expect(area("ODN1")).toBe(14);
    expect(area("TOP1")).toBe(16);
    expect(area("EMG1")).toBe(22);
    expect(area("EMG3")).toBe(18);
    expect(area("ATP-GIN2a")).toBe(30);
    expect(area("ATP-GIN2c")).toBe(36);
  });

  it("compara el área proyectada en el borde exacto", () => {
    expect(checkHealthArea("MED1", "I-1", 13.5).pass).toBe(true);
    expect(checkHealthArea("MED1", "I-1", 13.49).pass).toBe(false);
    expect(checkHealthArea("MED1", "I-2", 12).check.limit).toBe("≥ 13.50 m²");
  });

  it("la sala de partos solo aplica a I-4 y el botadero a I-3 e I-4", () => {
    const parto = checkHealthArea("ATP-GIN2a", "I-2", 40);
    expect(parto.applies).toBe(false);
    expect(parto.pass).toBe(false);
    expect(checkHealthArea("ATP-GIN2a", "I-4", 30).pass).toBe(true);
    expect(checkHealthArea("BOT", "I-1", 5).applies).toBe(false);
    expect(checkHealthArea("BOT", "I-3", 4).pass).toBe(true);
  });

  it("rechaza ambientes desconocidos y valores inválidos", () => {
    expect(() => checkHealthArea("XXX", "I-1", 10)).toThrow();
    expect(() => checkHealthArea("MED1", "I-1", -1)).toThrow();
    expect(() => checkHealthArea("MED1", "I-1", Number.NaN)).toThrow();
  });
});

describe("NTS 113 · corredores, puertas, escaleras y altura", () => {
  it("corredores: 2.40 m y suplementos de espera", () => {
    expect(checkHealthCorridor("interior", 2.4).pass).toBe(true);
    expect(checkHealthCorridor("interior", 2.39).pass).toBe(false);
    expect(checkHealthCorridor("espera-un-lado", 2.99).pass).toBe(false);
    expect(checkHealthCorridor("espera-ambos-lados", 3.6).pass).toBe(true);
    expect(checkHealthCorridor("tecnico-exterior", 1.5).pass).toBe(true);
  });

  it("puertas del Anexo N° 1", () => {
    expect(checkHealthDoor("consultorio", 1).pass).toBe(true);
    expect(checkHealthDoor("topico", 1.1).pass).toBe(false);
    expect(checkHealthDoor("sala-partos", 1.4).pass).toBe(true);
    expect(checkHealthDoor("ingreso-principal", 1.79).pass).toBe(false);
  });

  it("escalera integrada por categoría", () => {
    expect(integratedStairWidth("I-1")).toBe(1.2);
    expect(integratedStairWidth("I-2")).toBe(1.2);
    expect(integratedStairWidth("I-3")).toBe(1.5);
    expect(checkHealthStair("I-4", 1.2).pass).toBe(false);
  });

  it("altura libre según categoría y tipo de proyecto I-4", () => {
    expect(healthMinimumHeight("I-1")).toBe(2.7);
    expect(healthMinimumHeight("I-3")).toBe(2.7);
    expect(healthMinimumHeight("I-4", "nuevo")).toBe(3);
    expect(healthMinimumHeight("I-4", "existente")).toBe(2.7);
    expect(healthMinimumHeight("I-4", "existente", true)).toBe(3);
    expect(checkHealthHeight("I-4", 2.9, "nuevo").pass).toBe(false);
    expect(checkHealthHeight("I-2", 2.7).pass).toBe(true);
  });

  it("porcentaje de circulación interior", () => {
    expect(circulationShare("I-1")).toBe(0.25);
    expect(circulationShare("I-3")).toBe(0.3);
    expect(circulationShare("I-4")).toBe(0.35);
  });
});

describe("NTS 113 · fichas", () => {
  it("cada ficha cita numeral, resolución y fecha de verificación", () => {
    for (const card of NTS113_CARDS) {
      expect(card.norm_code).toBe("NTS 113");
      expect(card.category).toBe("Salud");
      expect(card.article).toMatch(/Num\.|Anexo/);
      expect(card.source_resolution).toContain("045-2015");
      expect(card.verified_at).toBeTruthy();
    }
    expect(new Set(NTS113_CARDS.map((c) => c.slug)).size).toBe(NTS113_CARDS.length);
  });
});
