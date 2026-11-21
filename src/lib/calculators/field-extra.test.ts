import { describe, expect, it } from "vitest";
import {
  convertScale,
  imperialToMetric,
  lotCoverage,
  metricToImperial,
  roofPitch,
} from "./field-extra";

describe("conversor de escalas", () => {
  it("convierte centímetros en plano y metros reales en ambos sentidos", () => {
    expect(convertScale(8, 125, "real")).toBe(10);
    expect(convertScale(10, 125, "plano")).toBe(8);
    expect(convertScale(0, 37, "real")).toBe(0);
  });

  it("rechaza longitudes, escalas y resultados inválidos", () => {
    expect(() => convertScale(-1, 100, "real")).toThrow(/Longitud/);
    expect(() => convertScale(2, 0, "plano")).toThrow(/escala/);
    expect(() => convertScale(2, Infinity, "plano")).toThrow(/escala/);
    expect(() => convertScale(Number.MAX_VALUE, 500, "real")).toThrow(/rango/);
  });
});

describe("pendiente de techo", () => {
  it("calcula porcentaje, ángulo, relación y longitud de vertiente", () => {
    const pitch = roofPitch(3, 4);
    expect(pitch).toMatchObject({ percent: 75, denominator: 4 / 3, length: 5 });
    expect(pitch.degrees).toBeCloseTo(36.87);
    expect(roofPitch(0, 5)).toEqual({ percent: 0, degrees: 0, denominator: null, length: 5 });
  });

  it.each([
    [-1, 2],
    [1, 0],
    [1, -1],
    [NaN, 2],
    [1, Infinity],
  ])("rechaza %s y %s", (rise, run) => {
    expect(() => roofPitch(rise, run)).toThrow(/desnivel/);
  });
});

describe("cobertura y área libre", () => {
  it("calcula porcentajes y coeficiente con dos áreas techadas", () => {
    expect(lotCoverage(200, 120, 300)).toEqual({
      occupancy: 60,
      freeArea: 40,
      coefficient: 1.5,
      warning: null,
    });
    expect(lotCoverage(100, 0, 0).freeArea).toBe(100);
    expect(lotCoverage(100, 100, 100)).toMatchObject({ freeArea: 0, warning: null });
  });

  it("muestra el exceso de ocupación y rechaza áreas incoherentes", () => {
    const over = lotCoverage(100, 110, 200);
    expect(over.freeArea).toBeCloseTo(-10);
    expect(over.warning).toContain("supera");
    expect(() => lotCoverage(0, 0, 0)).toThrow(/lote/);
    expect(() => lotCoverage(100, -1, 5)).toThrow(/no negativas/);
    expect(() => lotCoverage(100, 1, -5)).toThrow(/no negativas/);
    expect(() => lotCoverage(100, 5, 4)).toThrow(/supera/);
    expect(() => lotCoverage(100, NaN, 4)).toThrow();
  });
});

describe("pies y pulgadas", () => {
  it.each(["5 3/8", "5.375", "5,375"])("convierte %s pulgadas", (value) => {
    const metric = imperialToMetric(5, value);
    expect(metric.meters).toBeCloseTo(1.660525);
    expect(metric.centimeters).toBeCloseTo(166.0525);
    expect(imperialToMetric(0, "3/8").meters).toBeCloseTo(0.009525);
  });

  it("redondea pulgadas decimales y fracciones con sus propios acarreos", () => {
    expect(metricToImperial(0)).toEqual({
      decimal: { feet: 0, inches: 0 },
      fractional: { feet: 0, inches: "0" },
    });
    expect(metricToImperial(1.660525)).toEqual({
      decimal: { feet: 5, inches: 5.38 },
      fractional: { feet: 5, inches: "5 3/8" },
    });
    expect(metricToImperial(11.98 * 0.0254)).toEqual({
      decimal: { feet: 0, inches: 11.98 },
      fractional: { feet: 1, inches: "0" },
    });
    expect(metricToImperial(11.999 * 0.0254).decimal).toEqual({ feet: 1, inches: 0 });
  });

  it("rechaza medidas negativas o fuera de rango y fracciones inválidas", () => {
    expect(() => imperialToMetric(-1, "5")).toThrow(/pies/);
    expect(() => imperialToMetric(1, "5 3/0")).toThrow(/Fracción/);
    expect(() => imperialToMetric(1, "abc")).toThrow(/pulgadas/);
    expect(() => metricToImperial(-1)).toThrow(/metros/);
    expect(() => metricToImperial(Number.MAX_VALUE)).toThrow(/rango/);
  });
});
