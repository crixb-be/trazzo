export type Relation = "necesaria" | "deseable" | "innecesaria";
export interface Room {
  id: string;
  name: string;
}
export interface RelationMatrix {
  rooms: Room[];
  relations: Record<string, Relation>;
  weights: Record<Relation, number>;
}
export const DEFAULT_WEIGHTS = { necesaria: 3, deseable: 1, innecesaria: 0 };
export function pairKey(a: string, b: string): string {
  return JSON.stringify([a, b].sort());
}
export function getRelation(matrix: RelationMatrix, a: string, b: string): Relation {
  return matrix.relations[pairKey(a, b)] ?? "innecesaria";
}
export function rankRooms(matrix: RelationMatrix) {
  return matrix.rooms
    .map((room) => ({
      ...room,
      score: matrix.rooms.reduce(
        (total, other) =>
          total +
          (other.id === room.id ? 0 : matrix.weights[getRelation(matrix, room.id, other.id)]),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
export function removeRoom(matrix: RelationMatrix, id: string): RelationMatrix {
  const rooms = matrix.rooms.filter((room) => room.id !== id);
  const relations: Record<string, Relation> = {};
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++) {
      const key = pairKey(rooms[i].id, rooms[j].id);
      if (matrix.relations[key]) relations[key] = matrix.relations[key];
    }
  return { ...matrix, rooms, relations };
}
export function diagramNodes(rooms: Room[]) {
  return rooms.map((room, i) => ({
    ...room,
    x: 400 + 260 * Math.cos((2 * Math.PI * i) / rooms.length - Math.PI / 2),
    y: 340 + 260 * Math.sin((2 * Math.PI * i) / rooms.length - Math.PI / 2),
  }));
}
