import type { Room, Zone } from "./relations";

export const ROW = 34;
export const h = ROW / 2;
export const ZONE_COL = 34;
export const HEADER = 40;
export const PAD = 24;
export const W = 280;
/** Width of the "R1:" column in the rank summary; names start after it. */
export const SIDE_COL = 50;

export interface Point {
  x: number;
  y: number;
}
export interface LayoutRow {
  index: number;
  room: Room;
  y: number;
  yc: number;
}
export interface LayoutCell {
  i: number;
  j: number;
  aId: string;
  bId: string;
  points: Point[];
  cx: number;
  cy: number;
}
export interface LayoutZoneBlock {
  start: number;
  end: number;
  zone: Zone;
  points: Point[];
  edgeTriangles: Point[][];
}
export interface LayoutGroupRoom {
  id: string;
  name: string;
  zone: Zone;
  sum?: number;
}
export interface LayoutSideLine {
  rank: number;
  text: string;
  y: number;
  first: boolean;
}
export interface MatrixLayout {
  viewWidth: number;
  viewHeight: number;
  gx: number;
  top: number;
  x0: number;
  nameCol: number;
  rows: LayoutRow[];
  zoneBlocks: LayoutZoneBlock[];
  cells: LayoutCell[];
  sumCells: Array<LayoutCell & { value: number }>;
  rankCells: Array<LayoutCell & { value: number }>;
  labels: { sumatoria: Point; rango: Point };
  side: {
    x: number;
    y: number;
    width: number;
    height: number;
    lines: LayoutSideLine[];
    legend: { y: number; height: number };
  };
}

/**
 * Conservative advance-width estimate (in em) for Inter / Segoe UI at weight 560–700.
 * It errs wide on purpose: a label that is truncated a little early reads fine,
 * one that spills over the rhombi does not.
 */
function charWidthEm(character: string): number {
  if (character === " ") return 0.3;
  if (/[.,:;'·|!]/.test(character)) return 0.32;
  if (/[()\-–/]/.test(character)) return 0.4;
  if (/[0-9]/.test(character)) return 0.64;
  if (/[MWÑ]/.test(character)) return 0.92;
  if (/[IJ]/.test(character)) return 0.36;
  if (/[mw]/.test(character)) return 0.86;
  if (/[ijlft]/.test(character)) return 0.36;
  if (character !== character.toLocaleLowerCase("es")) return 0.74;
  return 0.6;
}
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const character of text) em += charWidthEm(character);
  return em * fontSize;
}
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
function point(x: number, y: number): Point {
  return { x: round(x), y: round(y) };
}
function wrapText(text: string, width: number, fontSize: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && estimateTextWidth(candidate, fontSize) > width) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}
function roomGroups(rooms: Room[]): Array<{ start: number; end: number; zone: Zone }> {
  const groups: Array<{ start: number; end: number; zone: Zone }> = [];
  rooms.forEach((room, index) => {
    const last = groups[groups.length - 1];
    if (last?.zone === room.zone) last.end = index;
    else groups.push({ start: index, end: index, zone: room.zone });
  });
  return groups;
}

export function matrixLayout(
  roomsOrdenados: Room[],
  groups: Array<{ rank: number; rooms: LayoutGroupRoom[] }>,
): MatrixLayout {
  const n = roomsOrdenados.length;
  const longest = roomsOrdenados.reduce(
    (max, room) => Math.max(max, estimateTextWidth(room.name.toLocaleUpperCase("es"), 12)),
    0,
  );
  const nameCol = Math.min(280, Math.max(170, longest + 28));
  const x0 = PAD;
  const top0 = PAD + 44;
  const top = top0 + HEADER;
  const gx = x0 + ZONE_COL + nameCol;
  const rows = roomsOrdenados.map((room, index) => ({
    index,
    room,
    y: round(top + index * ROW),
    yc: round(top + (index + 0.5) * ROW),
  }));
  const zoneBlocks = roomGroups(roomsOrdenados).map((block) => ({
    ...block,
    points: [
      point(gx, top + block.start * ROW),
      point(gx + (block.end - block.start + 1) * h, top + (block.start + block.end + 1) * h),
      point(gx, top + (block.end + 1) * ROW),
    ],
    edgeTriangles: Array.from({ length: block.end - block.start + 1 }, (_, offset) => {
      const i = block.start + offset;
      return [
        point(gx, top + i * ROW),
        point(gx + h, top + (i + 0.5) * ROW),
        point(gx, top + (i + 1) * ROW),
      ];
    }),
  }));
  const cells: LayoutCell[] = [];
  if (n >= 2)
    for (let i = 0; i < n; i += 1)
      for (let j = i + 1; j < n; j += 1) {
        const cx = gx + (j - i) * h;
        const cy = top + (i + j + 1) * h;
        cells.push({
          i,
          j,
          aId: roomsOrdenados[i].id,
          bId: roomsOrdenados[j].id,
          cx: round(cx),
          cy: round(cy),
          points: [point(cx, cy - h), point(cx + h, cy), point(cx, cy + h), point(cx - h, cy)],
        });
      }
  const rankingById = new Map(
    groups.flatMap((group) => group.rooms.map((room) => [room.id, group.rank] as const)),
  );
  const sumCells: Array<LayoutCell & { value: number }> = [];
  const rankCells: Array<LayoutCell & { value: number }> = [];
  if (n >= 2)
    for (const room of groups.flatMap((group) => group.rooms)) {
      const i = roomsOrdenados.findIndex((candidate) => candidate.id === room.id);
      if (i < 0) continue;
      const makeCell = (j: number): LayoutCell => {
        const cx = gx + (j - i) * h;
        const cy = top + (i + j + 1) * h;
        return {
          i,
          j,
          aId: room.id,
          bId: "",
          cx: round(cx),
          cy: round(cy),
          points: [point(cx, cy - h), point(cx + h, cy), point(cx, cy + h), point(cx - h, cy)],
        };
      };
      sumCells.push({ ...makeCell(n), value: room.sum ?? 0 });
      rankCells.push({ ...makeCell(n + 1), value: rankingById.get(room.id) ?? 0 });
    }
  const sideLines: LayoutSideLine[] = [];
  // Header baseline sits at top0 + 18; the first rank line clears it by a full line.
  let cursor = top0 + 40;
  for (const group of groups) {
    const names = group.rooms.map((room) => room.name);
    const joined =
      names.length > 1
        ? `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`
        : (names[0] ?? "");
    const lines = wrapText(joined, W - SIDE_COL, 12);
    lines.forEach((line, index) =>
      sideLines.push({
        rank: group.rank,
        text: line,
        y: round(cursor + index * 18),
        first: index === 0,
      }),
    );
    cursor += lines.length * 18;
  }
  const summaryHeight = Math.max(26, cursor - top0);
  const sideHeight = summaryHeight + 20 + 104;
  const sideX = Math.max(gx + sideHeight + 28, gx + 2 * h + 28);
  const labels = {
    sumatoria: point(gx - 4, top + (2 * n + 1) * h + 4),
    rango: point(gx + h - 4, top + (2 * n + 2) * h + 4),
  };
  return {
    viewWidth: round(Math.max(gx + (n + 2) * h, sideX + W) + PAD),
    viewHeight: round(Math.max(top + (n + 1) * ROW + 40, top0 + sideHeight) + PAD),
    gx: round(gx),
    top: round(top),
    x0,
    nameCol,
    rows,
    zoneBlocks,
    cells,
    sumCells,
    rankCells,
    labels,
    side: {
      x: round(sideX),
      y: top0,
      width: W,
      height: round(sideHeight),
      lines: sideLines,
      legend: { y: round(top0 + summaryHeight + 20), height: 104 },
    },
  };
}
