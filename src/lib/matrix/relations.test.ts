import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  METHOD_EXAMPLE,
  METHOD_WEIGHTS,
  computeRanking,
  cycleRelation,
  getRelation,
  normalizeMatrix,
  orderedRooms,
  pairKey,
  rankGroups,
  removeRoom,
  setRelation,
  type RelationMatrix,
} from "./relations";

const matrix: RelationMatrix = {
  rooms: [
    { id: "a", name: "Sala", zone: "social" },
    { id: "b", name: "Cocina", zone: "servicio" },
    { id: "c", name: "Patio", zone: "privada" },
  ],
  relations: { [pairKey("a", "b")]: "necesaria", [pairKey("b", "c")]: "deseable" },
  weights: DEFAULT_WEIGHTS,
};

describe("relaciones arquitectónicas", () => {
  it("mantiene simetría y claves seguras", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
    expect(pairKey("a-b", "c")).not.toBe(pairKey("a", "b-c"));
    expect(getRelation(matrix, "b", "a")).toBe("necesaria");
  });

  it("cicla innecesaria → necesaria → deseable → innecesaria", () => {
    expect(cycleRelation("innecesaria")).toBe("necesaria");
    expect(cycleRelation("necesaria")).toBe("deseable");
    expect(cycleRelation("deseable")).toBe("innecesaria");
  });

  it("usa 4/2/0, elimina la clave vacía y calcula rango denso", () => {
    const next = setRelation(matrix, "a", "c", "necesaria");
    const ranking = computeRanking(next);
    expect(ranking.map((room) => [room.id, room.sum, room.rank])).toEqual([
      ["a", 8, 1],
      ["b", 6, 2],
      ["c", 6, 2],
    ]);
    expect(setRelation(next, "a", "c", "innecesaria").relations[pairKey("a", "c")]).toBeUndefined();
    expect(METHOD_WEIGHTS).toEqual({ necesaria: 4, deseable: 2, innecesaria: 0 });
  });

  it("reproduce las sumas y grupos del ejemplo del manual", () => {
    const ranking = computeRanking(METHOD_EXAMPLE);
    expect(ranking.map((room) => [room.name, room.sum])).toEqual([
      ["Sala", 6],
      ["S.S. de visitas", 4],
      ["Comedor", 12],
      ["Cocina", 10],
      ["Garaje", 6],
      ["Lavandería", 10],
      ["Patio", 8],
      ["Dormitorio 1", 8],
      ["Dormitorio 2", 8],
      ["Serv. sanitario general", 4],
    ]);
    expect(
      rankGroups(ranking).map((group) => [group.rank, group.rooms.map((room) => room.name)]),
    ).toEqual([
      [1, ["Comedor"]],
      [2, ["Cocina", "Lavandería"]],
      [3, ["Patio", "Dormitorio 1", "Dormitorio 2"]],
      [4, ["Sala", "Garaje"]],
      [5, ["S.S. de visitas", "Serv. sanitario general"]],
    ]);
  });

  it("normaliza respaldos legados, fuerza pesos y elimina huérfanas", () => {
    const normalized = normalizeMatrix({
      rooms: [
        { id: "a", name: "Sala" },
        { id: "b", name: "Cocina", zone: "servicio" },
      ],
      relations: {
        [pairKey("a", "b")]: "necesaria",
        [pairKey("a", "missing")]: "deseable",
        basura: "necesaria",
        [pairKey("a", "a")]: "deseable",
      },
      weights: { necesaria: 3, deseable: 1, innecesaria: 0 },
    });
    expect(normalized.rooms[0].zone).toBe("social");
    expect(normalized.weights).toEqual(METHOD_WEIGHTS);
    expect(Object.keys(normalized.relations)).toEqual([pairKey("a", "b")]);
    expect(() => normalizeMatrix("basura")).toThrow();
  });

  it("ordena por zona y conserva inserción dentro de cada zona", () => {
    expect(
      orderedRooms({
        ...matrix,
        rooms: [
          matrix.rooms[2],
          matrix.rooms[1],
          matrix.rooms[0],
          { id: "d", name: "Sala 2", zone: "social" },
        ],
      }).map((room) => room.id),
    ).toEqual(["a", "d", "b", "c"]);
  });

  it("elimina relaciones al quitar un ambiente sin mutar el original", () => {
    const next = removeRoom(matrix, "b");
    expect(next.rooms).toHaveLength(2);
    expect(next.relations).toEqual({});
    expect(matrix.rooms).toHaveLength(3);
  });
});
