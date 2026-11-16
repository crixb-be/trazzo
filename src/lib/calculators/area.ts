export interface Point {
  x: number;
  y: number;
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(a: Point, b: Point, c: Point, d: Point) {
  const on = (a: Point, b: Point, c: Point) =>
    cross(a, b, c) === 0 &&
    c.x >= Math.min(a.x, b.x) &&
    c.x <= Math.max(a.x, b.x) &&
    c.y >= Math.min(a.y, b.y) &&
    c.y <= Math.max(a.y, b.y);
  return (
    (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function polygonArea(points: Point[]) {
  if (points.length < 3 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    throw new Error("Introduce al menos tres vértices con coordenadas finitas.");
  if (new Set(points.map((p) => JSON.stringify([p.x, p.y]))).size !== points.length)
    throw new Error("No repitas vértices; el cierre es automático.");
  const n = points.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (intersects(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n]))
        throw new Error("Los lados se cruzan o se tocan: revisa el orden del contorno.");
    }
  // Trasladar el origen reduce cancelación en coordenadas topográficas grandes.
  const p = points.map((v) => ({ x: v.x - points[0].x, y: v.y - points[0].y }));
  const area =
    Math.abs(
      p.reduce((sum, a, i) => {
        const b = p[(i + 1) % n];
        return sum + a.x * b.y - b.x * a.y;
      }, 0),
    ) / 2;
  if (!Number.isFinite(area) || area === 0) throw new Error("El polígono no tiene área válida.");
  return area;
}
