import { describe, expect, it } from "vitest";
import { A040_CARDS, MINEDU208_CARDS, MINEDU208_ROOMS } from "@/data/norms/education";
import {
  a040DoorsRequired,
  a040Occupants,
  a040StairsRequired,
  a040StudentFixtures,
  minedu208Applies,
  minedu208ClassroomArea,
  minedu208FloorsOk,
  minedu208FreeArea,
  minedu208Library,
  minedu208Sum,
} from "./education";

describe("A.040 · aparatos sanitarios (Art. 20)", () => {
  it("primaria y secundaria: Cuadro N° 4 con mitades iguales", () => {
    const r = a040StudentFixtures("primaria", 120);
    expect(r.perGroup).toBe(60);
    expect(r.men).toEqual({ toilets: 1, lavatories: 2, urinals: 1 });
    expect(r.women).toEqual({ toilets: 2, lavatories: 2, urinals: 0 });
    const s = a040StudentFixtures("secundaria", 122);
    expect(s.men.toilets).toBe(2);
    expect(s.women.toilets).toBe(3);
  });

  it("inicial: 1 aparato cada 25 niños o niñas", () => {
    const r = a040StudentFixtures("inicial", 50);
    expect(r.men).toEqual({ toilets: 1, lavatories: 1, urinals: 1 });
    expect(r.women).toEqual({ toilets: 1, lavatories: 1, urinals: 0 });
    expect(a040StudentFixtures("inicial", 52).men.toilets).toBe(2);
  });

  it("superior usa el Cuadro N° 7 y cero estudiantes no exige aparatos", () => {
    expect(a040StudentFixtures("superior", 60).ref).toContain("Cuadro N° 7");
    expect(a040StudentFixtures("primaria", 0).men.toilets).toBe(0);
    expect(() => a040StudentFixtures("primaria", -1)).toThrow();
  });
});

describe("A.040 · ocupantes, puertas y escaleras", () => {
  it("Cuadro N° 3 redondea hacia arriba", () => {
    expect(a040Occupants("aulas", 60)).toBe(40);
    expect(a040Occupants("sum", 300)).toBe(300);
    expect(a040Occupants("talleres", 90)).toBe(30);
    expect(a040Occupants("oficinas", 95)).toBe(10);
  });

  it("dos puertas con aforo mayor a 50 y dos escaleras con más de un piso", () => {
    expect(a040DoorsRequired(50)).toBe(1);
    expect(a040DoorsRequired(51)).toBe(2);
    expect(a040StairsRequired(1)).toBe(0);
    expect(a040StairsRequired(2)).toBe(2);
  });
});

describe("RVM 208-2019-MINEDU", () => {
  it("solo aplica a primaria y secundaria", () => {
    expect(minedu208Applies("primaria")).toBe(true);
    expect(minedu208Applies("secundaria")).toBe(true);
    expect(minedu208Applies("inicial")).toBe(false);
    expect(minedu208Applies("superior")).toBe(false);
  });

  it("aula: 2.00 m² por estudiante y 1.67 excepcional", () => {
    expect(minedu208ClassroomArea(30)).toBe(60);
    expect(minedu208ClassroomArea(30, true)).toBe(50.1);
    expect(MINEDU208_ROOMS.find((r) => r.id === "ept")?.area).toBe(105);
  });

  it("biblioteca por número de secciones", () => {
    expect(minedu208Library(5, "primaria").type).toBeNull();
    expect(minedu208Library(5, "secundaria").type).toBe("I");
    expect(minedu208Library(30, "primaria")).toMatchObject({ type: "I", area: 75 });
    expect(minedu208Library(31, "primaria")).toMatchObject({ type: "II", area: 90 });
    expect(minedu208Library(48, "secundaria").type).toBe("II");
    expect(minedu208Library(49, "secundaria").type).toBeNull();
    expect(minedu208Library(50, "secundaria")).toMatchObject({ type: "III", area: 120 });
  });

  it("SUM: tope de 300 m² desde 5 secciones y mínimo de taller con menos", () => {
    expect(minedu208Sum(450, 15)).toMatchObject({ area: 300, rule: "tope-300" });
    expect(minedu208Sum(200, 5).area).toBe(200);
    expect(minedu208Sum(60, 2)).toMatchObject({ area: 90, rule: "minimo-taller" });
    expect(minedu208Sum(120, 4).area).toBe(120);
  });

  it("área libre por tipo de terreno y máximo de 4 pisos", () => {
    expect(minedu208FreeArea("I", 1000)).toBe(300);
    expect(minedu208FreeArea("II", 1000)).toBe(400);
    expect(minedu208FreeArea("III", 1000)).toBe(600);
    expect(minedu208FreeArea("privada", 1000)).toBe(400);
    expect(minedu208FloorsOk(4)).toBe(true);
    expect(minedu208FloorsOk(5)).toBe(false);
  });
});

describe("Educación · fichas", () => {
  it("cada ficha cita artículo o cuadro, resolución y verificación", () => {
    for (const card of [...A040_CARDS, ...MINEDU208_CARDS]) {
      expect(card.category).toBe("Educación");
      expect(card.article).toMatch(/Art\.|Cuadro|Num\./);
      expect(card.source_resolution).toMatch(/068-2020-VIVIENDA|208-2019-MINEDU/);
      expect(card.verified_at).toBeTruthy();
    }
  });
});
