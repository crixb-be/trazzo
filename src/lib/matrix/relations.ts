export type Relation = "necesaria" | "deseable" | "innecesaria";
export type Zone = "social" | "semisocial" | "servicio" | "privada";

export interface Room {
  id: string;
  name: string;
  zone: Zone;
}

export interface ZoneDefinition {
  id: Zone;
  label: string;
  short: string;
  color: string;
  ink: string;
  tint: string;
}

export const ZONES: readonly ZoneDefinition[] = [
  {
    id: "social",
    label: "Social",
    short: "SOC",
    color: "#2f9e57",
    ink: "#ffffff",
    tint: "#d1eada",
  },
  {
    id: "semisocial",
    label: "Semisocial",
    short: "SeS",
    color: "#ef8f2f",
    ink: "#2a1a05",
    tint: "#fce6d1",
  },
  {
    id: "servicio",
    label: "Servicio",
    short: "SERV",
    color: "#f2c53d",
    ink: "#2a2205",
    tint: "#f9edd0",
  },
  {
    id: "privada",
    label: "Privada",
    short: "PRIV",
    color: "#c9553f",
    ink: "#ffffff",
    tint: "#eed6d2",
  },
] as const;

export const METHOD_WEIGHTS = { necesaria: 4, deseable: 2, innecesaria: 0 } as const;
export const DEFAULT_WEIGHTS = METHOD_WEIGHTS;

export interface RelationMatrix {
  rooms: Room[];
  relations: Record<string, Relation>;
  weights: Record<Relation, number>;
}

const relationValues = new Set<Relation>(["necesaria", "deseable", "innecesaria"]);
const zoneValues = new Set<Zone>(ZONES.map((zone) => zone.id));

export function pairKey(a: string, b: string): string {
  return JSON.stringify([a, b].sort());
}

export function getRelation(matrix: RelationMatrix, a: string, b: string): Relation {
  return matrix.relations[pairKey(a, b)] ?? "innecesaria";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeMatrix(raw: unknown): RelationMatrix {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!isRecord(parsed) || !Array.isArray(parsed.rooms) || !isRecord(parsed.relations)) {
    throw new Error("La matriz guardada no es válida");
  }
  if (parsed.rooms.length > 20) throw new Error("La matriz supera el máximo de ambientes");

  const ids = new Set<string>();
  const rooms: Room[] = parsed.rooms.map((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string"
    ) {
      throw new Error("La matriz contiene un ambiente inválido");
    }
    if (!candidate.id || ids.has(candidate.id)) throw new Error("La matriz contiene ids repetidos");
    ids.add(candidate.id);
    const zone =
      typeof candidate.zone === "string" && zoneValues.has(candidate.zone as Zone)
        ? (candidate.zone as Zone)
        : "social";
    return { id: candidate.id, name: candidate.name.slice(0, 40), zone };
  });

  const relations: Record<string, Relation> = {};
  for (const [key, value] of Object.entries(parsed.relations)) {
    if (typeof value !== "string" || !relationValues.has(value as Relation)) continue;
    let idsInKey: unknown;
    try {
      idsInKey = JSON.parse(key);
    } catch {
      continue;
    }
    if (
      !Array.isArray(idsInKey) ||
      idsInKey.length !== 2 ||
      typeof idsInKey[0] !== "string" ||
      typeof idsInKey[1] !== "string" ||
      idsInKey[0] === idsInKey[1] ||
      !ids.has(idsInKey[0]) ||
      !ids.has(idsInKey[1])
    )
      continue;
    if (value !== "innecesaria") relations[pairKey(idsInKey[0], idsInKey[1])] = value as Relation;
  }
  return { rooms, relations, weights: { ...METHOD_WEIGHTS } };
}

export function orderedRooms(matrix: RelationMatrix | Room[]): Room[] {
  const rooms = Array.isArray(matrix) ? matrix : matrix.rooms;
  const zoneOrder = new Map(ZONES.map((zone, index) => [zone.id, index]));
  return rooms
    .map((room, index) => ({ room, index }))
    .sort(
      (a, b) =>
        (zoneOrder.get(a.room.zone) ?? 0) - (zoneOrder.get(b.room.zone) ?? 0) || a.index - b.index,
    )
    .map(({ room }) => room);
}

export function cycleRelation(relation: Relation): Relation {
  if (relation === "innecesaria") return "necesaria";
  if (relation === "necesaria") return "deseable";
  return "innecesaria";
}

export function setRelation(
  matrix: RelationMatrix,
  a: string,
  b: string,
  relation: Relation,
): RelationMatrix {
  const relations = { ...matrix.relations };
  const key = pairKey(a, b);
  if (relation === "innecesaria") delete relations[key];
  else relations[key] = relation;
  return { ...matrix, relations, weights: { ...METHOD_WEIGHTS } };
}

export function setRoomZone(matrix: RelationMatrix, id: string, zone: Zone): RelationMatrix {
  return {
    ...matrix,
    rooms: matrix.rooms.map((room) => (room.id === id ? { ...room, zone } : room)),
    weights: { ...METHOD_WEIGHTS },
  };
}

export interface RankingRoom {
  id: string;
  name: string;
  zone: Zone;
  sum: number;
  rank: number;
}

export function computeRanking(matrix: RelationMatrix): RankingRoom[] {
  const rooms = orderedRooms(matrix);
  const sums = rooms.map((room) => ({
    ...room,
    sum: rooms.reduce(
      (total, other) =>
        total + (room.id === other.id ? 0 : METHOD_WEIGHTS[getRelation(matrix, room.id, other.id)]),
      0,
    ),
  }));
  const distinctSums = [...new Set(sums.map((room) => room.sum))].sort((a, b) => b - a);
  return sums.map((room) => ({ ...room, rank: distinctSums.indexOf(room.sum) + 1 }));
}

export function rankGroups(
  ranking: RankingRoom[],
): Array<{ rank: number; rooms: Array<Pick<RankingRoom, "id" | "name" | "zone">> }> {
  const groups = new Map<number, Array<Pick<RankingRoom, "id" | "name" | "zone">>>();
  for (const room of ranking)
    groups.set(room.rank, [
      ...(groups.get(room.rank) ?? []),
      { id: room.id, name: room.name, zone: room.zone },
    ]);
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([rank, rooms]) => ({ rank, rooms }));
}

export function removeRoom(matrix: RelationMatrix, id: string): RelationMatrix {
  const rooms = matrix.rooms.filter((room) => room.id !== id);
  const validIds = new Set(rooms.map((room) => room.id));
  const relations: Record<string, Relation> = {};
  for (const [key, relation] of Object.entries(matrix.relations)) {
    let ids: unknown;
    try {
      ids = JSON.parse(key);
    } catch {
      continue;
    }
    if (
      Array.isArray(ids) &&
      ids.length === 2 &&
      ids.every((roomId) => typeof roomId === "string") &&
      ids.every((roomId) => validIds.has(roomId as string))
    )
      relations[pairKey(ids[0] as string, ids[1] as string)] = relation;
  }
  return { ...matrix, rooms, relations, weights: { ...METHOD_WEIGHTS } };
}

const exampleRooms: Room[] = [
  { id: "ej-sala", name: "Sala", zone: "social" },
  { id: "ej-ss-visitas", name: "S.S. de visitas", zone: "social" },
  { id: "ej-comedor", name: "Comedor", zone: "semisocial" },
  { id: "ej-cocina", name: "Cocina", zone: "servicio" },
  { id: "ej-garaje", name: "Garaje", zone: "servicio" },
  { id: "ej-lavanderia", name: "Lavandería", zone: "servicio" },
  { id: "ej-patio", name: "Patio", zone: "servicio" },
  { id: "ej-dorm1", name: "Dormitorio 1", zone: "privada" },
  { id: "ej-dorm2", name: "Dormitorio 2", zone: "privada" },
  { id: "ej-ss-general", name: "Serv. sanitario general", zone: "privada" },
];

const exampleRelations: Array<[string, string, Relation]> = [
  ["ej-sala", "ej-ss-visitas", "deseable"],
  ["ej-sala", "ej-comedor", "necesaria"],
  ["ej-ss-visitas", "ej-comedor", "deseable"],
  ["ej-comedor", "ej-cocina", "necesaria"],
  ["ej-comedor", "ej-garaje", "deseable"],
  ["ej-cocina", "ej-garaje", "deseable"],
  ["ej-cocina", "ej-lavanderia", "necesaria"],
  ["ej-garaje", "ej-lavanderia", "deseable"],
  ["ej-lavanderia", "ej-patio", "necesaria"],
  ["ej-patio", "ej-dorm1", "deseable"],
  ["ej-patio", "ej-dorm2", "deseable"],
  ["ej-dorm1", "ej-dorm2", "necesaria"],
  ["ej-dorm1", "ej-ss-general", "deseable"],
  ["ej-dorm2", "ej-ss-general", "deseable"],
];

export const METHOD_EXAMPLE: RelationMatrix = {
  rooms: exampleRooms,
  relations: Object.fromEntries(
    exampleRelations.map(([a, b, relation]) => [pairKey(a, b), relation]),
  ),
  weights: { ...METHOD_WEIGHTS },
};
