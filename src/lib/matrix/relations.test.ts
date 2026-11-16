import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  diagramNodes,
  getRelation,
  pairKey,
  rankRooms,
  removeRoom,
  type RelationMatrix,
} from "./relations";
const matrix: RelationMatrix = {
  rooms: [
    { id: "a", name: "Sala" },
    { id: "b", name: "Cocina" },
    { id: "c", name: "Patio" },
  ],
  relations: { [pairKey("a", "b")]: "necesaria", [pairKey("b", "c")]: "deseable" },
  weights: DEFAULT_WEIGHTS,
};
describe("relaciones arquitectónicas", () => {
  it("cada par es simétrico y no colisiona por separadores", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
    expect(pairKey("a-b", "c")).not.toBe(pairKey("a", "b-c"));
    expect(getRelation(matrix, "b", "a")).toBe("necesaria");
  });
  it("pondera cada ambiente una vez por vecino y ordena", () => {
    expect(rankRooms(matrix).map((room) => [room.id, room.score])).toEqual([
      ["b", 4],
      ["a", 3],
      ["c", 1],
    ]);
    expect(
      rankRooms({ ...matrix, weights: { necesaria: 5, deseable: 2, innecesaria: -1 } })[0].score,
    ).toBe(7);
  });
  it("elimina relaciones huérfanas sin mutar el original", () => {
    const next = removeRoom(matrix, "b");
    expect(next.rooms).toHaveLength(2);
    expect(next.relations).toEqual({});
    expect(matrix.rooms).toHaveLength(3);
  });
  it("admite vacío y ubica nodos finitos", () => {
    expect(rankRooms({ ...matrix, rooms: [] })).toEqual([]);
    expect(diagramNodes([])).toEqual([]);
    expect(
      diagramNodes(matrix.rooms).every(
        (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
      ),
    ).toBe(true);
  });
});
