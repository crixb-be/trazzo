import { describe, expect, it } from "vitest";
import { computeRanking, METHOD_EXAMPLE, orderedRooms, rankGroups, type Room } from "./relations";
import { matrixLayout } from "./layout";

function rooms(count: number): Room[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r-${index}`,
    name: `Ambiente ${index}`,
    zone:
      index % 4 === 0
        ? "social"
        : index % 4 === 1
          ? "semisocial"
          : index % 4 === 2
            ? "servicio"
            : "privada",
  }));
}

describe("geometría de la lámina", () => {
  it("tesela la primera celda en gx y mantiene adyacencia diagonal", () => {
    const layout = matrixLayout(rooms(4), [
      { rank: 1, rooms: rooms(4).map((room) => ({ ...room })) },
    ]);
    const first = layout.cells.find((cell) => cell.i === 0 && cell.j === 1)!;
    expect(first.points[3]).toEqual({ x: layout.gx, y: layout.top + 34 });
    const next = layout.cells.find((cell) => cell.i === 1 && cell.j === 2)!;
    expect(next.points[0]).toEqual(first.points[2]);
  });

  it("coloca el ápice del triángulo de zona", () => {
    const layout = matrixLayout(
      orderedRooms(METHOD_EXAMPLE),
      rankGroups(computeRanking(METHOD_EXAMPLE)),
    );
    const social = layout.zoneBlocks[0];
    expect(social.points[1]).toEqual({ x: layout.gx + 34, y: layout.top + 34 });
  });

  it("coloca sumatoria y rango como diagonales inferiores", () => {
    const layout = matrixLayout(rooms(3), [
      { rank: 1, rooms: rooms(3).map((room, index) => ({ ...room, sum: index + 1 })) },
    ]);
    expect(layout.sumCells[0].cx).toBe(layout.gx + 3 * 17);
    expect(layout.rankCells[0].cx).toBe(layout.gx + 4 * 17);
    expect(layout.labels.sumatoria.y).toBe(layout.top + (2 * 3 + 1) * 17 + 4);
  });

  it("mantiene el resumen lateral encima del borde superior", () => {
    for (let count = 2; count <= 20; count += 1) {
      const input = rooms(count);
      const layout = matrixLayout(input, [{ rank: 1, rooms: input.map((room) => ({ ...room })) }]);
      const edge = layout.top + (layout.side.x - layout.gx);
      expect(layout.side.y + layout.side.height).toBeLessThanOrEqual(edge);
      expect(layout.viewWidth).toBeGreaterThanOrEqual(
        Math.max(
          ...layout.cells.flatMap((cell) => cell.points.map((point) => point.x)),
          layout.side.x + layout.side.width,
        ),
      );
      expect(layout.viewHeight).toBeGreaterThanOrEqual(
        Math.max(...layout.cells.flatMap((cell) => cell.points.map((point) => point.y))),
      );
      expect(
        [...layout.cells, ...layout.sumCells, ...layout.rankCells].every((cell) =>
          cell.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
        ),
      ).toBe(true);
    }
  });
});
