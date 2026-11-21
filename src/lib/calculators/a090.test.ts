import { describe, expect, it } from "vitest";
import { A090_CARDS, A090_OCCUPANCY } from "@/data/norms/a090";
import {
  a090AccessibleParking,
  a090EmployeeFixtures,
  a090Occupancy,
  a090PublicFixtures,
  formatFixtures,
} from "./a090";

describe("A.090 · aforo (Art. 11)", () => {
  it("usa los factores oficiales", () => {
    const factor = (id: string) => A090_OCCUPANCY.find((u) => u.id === id)?.factor;
    expect(factor("oficinas")).toBe(10);
    expect(factor("lectura")).toBe(4.5);
    expect(factor("libros")).toBe(10);
    expect(factor("reunion")).toBe(1);
    expect(factor("espectadores-pie")).toBe(0.25);
  });

  it("redondea hacia arriba", () => {
    expect(a090Occupancy("oficinas", 100)).toBe(10);
    expect(a090Occupancy("oficinas", 101)).toBe(11);
    expect(a090Occupancy("lectura", 45)).toBe(10);
    expect(a090Occupancy("espectadores-pie", 10)).toBe(40);
    expect(a090Occupancy("reunion", 0)).toBe(0);
    expect(() => a090Occupancy("oficinas", -1)).toThrow();
  });
});

describe("A.090 · servicios higiénicos (Art. 15 y 16)", () => {
  it("empleados: cada tramo de la tabla", () => {
    const one = a090EmployeeFixtures(6);
    expect(one.shared).toBe(true);
    expect(formatFixtures(one.men)).toBe("1L, 1u, 1I");
    expect(a090EmployeeFixtures(7).shared).toBe(false);
    expect(formatFixtures(a090EmployeeFixtures(25).women, false)).toBe("1L, 1I");
    expect(a090EmployeeFixtures(26).men.toilets).toBe(2);
    expect(a090EmployeeFixtures(75).men.toilets).toBe(2);
    expect(a090EmployeeFixtures(76).men.toilets).toBe(3);
    expect(a090EmployeeFixtures(200).men.toilets).toBe(3);
    expect(a090EmployeeFixtures(201).men.toilets).toBe(4);
    expect(a090EmployeeFixtures(300).men.toilets).toBe(4);
    expect(a090EmployeeFixtures(301).women.toilets).toBe(5);
    expect(a090EmployeeFixtures(0).men.toilets).toBe(0);
  });

  it("público: cada tramo de la tabla", () => {
    expect(a090PublicFixtures(100).men).toEqual({ lavatories: 1, urinals: 1, toilets: 1 });
    expect(a090PublicFixtures(100).women).toEqual({ lavatories: 1, urinals: 0, toilets: 1 });
    expect(a090PublicFixtures(101).men.toilets).toBe(2);
    expect(a090PublicFixtures(200).women.toilets).toBe(2);
    expect(a090PublicFixtures(201).men.toilets).toBe(3);
    expect(a090PublicFixtures(450).men.toilets).toBe(5);
  });

  it("Art. 16: un aparato accesible por servicio con tres o más artefactos", () => {
    // Hombres 1L+1u+1I = 3 artefactos; mujeres 1L+1I = 2.
    expect(a090PublicFixtures(50).accessible).toBe(1);
    // Hombres 6 y mujeres 4 artefactos.
    expect(a090PublicFixtures(150).accessible).toBe(2);
    expect(a090EmployeeFixtures(3).accessible).toBe(1);
  });

  it("rechaza cantidades no enteras o negativas", () => {
    expect(() => a090PublicFixtures(-1)).toThrow();
    expect(() => a090EmployeeFixtures(2.5)).toThrow();
  });
});

describe("A.090 · estacionamientos accesibles (Art. 17)", () => {
  it("1 cada 50 requeridos", () => {
    expect(a090AccessibleParking(0)).toBe(0);
    expect(a090AccessibleParking(50)).toBe(1);
    expect(a090AccessibleParking(51)).toBe(2);
  });
});

describe("A.090 · fichas", () => {
  it("cada ficha cita artículo y resolución", () => {
    for (const card of A090_CARDS) {
      expect(card.norm_code).toBe("A.090");
      expect(card.category).toBe("Servicios Comunales");
      expect(card.article).toMatch(/^Art\. /);
      expect(card.source_resolution).toContain("011-2006-VIVIENDA");
      expect(card.verified_at).toBeTruthy();
    }
  });
});
