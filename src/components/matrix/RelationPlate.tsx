"use client";

import { useMemo, useState, type FocusEvent, type KeyboardEvent, type Ref } from "react";
import {
  computeRanking,
  getRelation,
  orderedRooms,
  pairKey,
  rankGroups,
  type Relation,
  type RelationMatrix,
  ZONES,
} from "@/lib/matrix/relations";
import { estimateTextWidth, matrixLayout, h, SIDE_COL, W, type Point } from "@/lib/matrix/layout";

const INK = "#1d1d1f";
const MUTED = "#6d6a63";
const GRID = "#b9b6ae";
const ACCENT = "#d6453d";
const relationLabel: Record<Relation, string> = {
  necesaria: "necesaria",
  deseable: "deseable",
  innecesaria: "innecesaria",
};

export function fitText(text: string, maxWidth: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
  const ellipsis = "…";
  let output = "";
  for (const character of text) {
    if (estimateTextWidth(output + character + ellipsis, fontSize) > maxWidth) break;
    output += character;
  }
  return output ? output + ellipsis : ellipsis;
}

function pointsAttribute(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function cellIsTrace(cell: { aId: string; bId: string }, traceRoomIds: Set<string>): boolean {
  return traceRoomIds.has(cell.aId) || traceRoomIds.has(cell.bId);
}

function traceForRoom(setTraceRoomIds: (value: Set<string>) => void, id: string): void {
  setTraceRoomIds(new Set([id]));
}

export interface RelationPlateProps {
  matrix: RelationMatrix;
  interactive?: boolean;
  onCycle?: (aId: string, bId: string) => void;
  onSelectPair?: (aId: string, bId: string) => void;
  svgRef?: Ref<SVGSVGElement>;
}

export function RelationPlate({
  matrix,
  interactive = false,
  onCycle,
  onSelectPair,
  svgRef,
}: RelationPlateProps) {
  const ordered = orderedRooms(matrix);
  const ranking = computeRanking(matrix);
  const groups = rankGroups(ranking).map((group) => ({
    ...group,
    rooms: group.rooms.map((room) => ({
      ...room,
      sum: ranking.find((item) => item.id === room.id)?.sum ?? 0,
    })),
  }));
  const layout = useMemo(() => matrixLayout(ordered, groups), [groups, ordered]);
  const [traceRoomIds, setTraceRoomIds] = useState<Set<string>>(new Set());

  const clearTrace = (): void => setTraceRoomIds(new Set());
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, aId: string, bId: string): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectPair?.(aId, bId);
    onCycle?.(aId, bId);
  };
  const handleFocus = (event: FocusEvent<SVGGElement>, id: string): void => {
    if (event.currentTarget === event.target) traceForRoom(setTraceRoomIds, id);
  };
  const rankingById = new Map(ranking.map((room) => [room.id, room]));
  const zoneDefinition = (zone: string) => ZONES.find((item) => item.id === zone);

  return (
    <svg
      ref={svgRef}
      className="diagram-svg relation-plate"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      width={layout.viewWidth}
      height={layout.viewHeight}
      role="group"
      aria-label="Matriz de relaciones ponderadas"
      fontFamily="Inter, system-ui, sans-serif"
      // On screen the plate may shrink to 72 % to fit its panel; below that it scrolls.
      style={{
        width: "100%",
        maxWidth: layout.viewWidth,
        minWidth: Math.round(layout.viewWidth * 0.72),
      }}
      onMouseLeave={clearTrace}
    >
      <rect width={layout.viewWidth} height={layout.viewHeight} fill="#ffffff" />
      <text
        x={24}
        y={29}
        fill={INK}
        fontSize={13}
        fontWeight={700}
        letterSpacing=".08em"
        data-fit-width={layout.viewWidth - 48}
      >
        MATRIZ DE RELACIONES PONDERADAS
      </text>
      <text
        x={24}
        y={48}
        fill={MUTED}
        fontSize={10}
        letterSpacing=".06em"
        data-fit-width={layout.viewWidth - 48}
      >
        {`TRAZZO · ${ordered.length} ambientes · ${Object.keys(matrix.relations).length} relaciones`}
      </text>
      <text
        x={24 + 17}
        y={layout.top - 14}
        fill={INK}
        fontSize={10}
        fontWeight={650}
        textAnchor="middle"
        transform={`rotate(-45 ${24 + 17} ${layout.top - 14})`}
        data-fit-width={34}
      >
        ÁREA
      </text>
      <text
        x={layout.gx - (layout.nameCol ?? 170) + 34 + 8}
        y={layout.top - 14}
        fill={INK}
        fontSize={10.5}
        fontWeight={650}
        letterSpacing=".1em"
        data-fit-width={(layout.nameCol ?? 170) - 16}
      >
        ESPACIOS (AMBIENTES)
      </text>

      {layout.rows.map(({ room, y, index }) => {
        const zone = zoneDefinition(room.zone);
        const traced = traceRoomIds.has(room.id);
        const label = fitText(room.name.toLocaleUpperCase("es"), (layout.nameCol ?? 170) - 20, 12);
        return (
          <g
            key={room.id}
            className={`plate-row${traced ? " is-trace" : ""}`}
            tabIndex={-1}
            onMouseEnter={() => traceForRoom(setTraceRoomIds, room.id)}
            onFocus={(event) => handleFocus(event, room.id)}
          >
            <rect x={24} y={y} width={34} height={34} fill={zone?.color ?? "#d9d6cf"} />
            <rect
              x={58}
              y={y}
              width={layout.nameCol ?? 170}
              height={34}
              fill={zone?.tint ?? "#ffffff"}
            />
            <text
              x={75}
              y={y + 22}
              fill={INK}
              fontSize={12}
              fontWeight={560}
              data-fit-width={(layout.nameCol ?? 170) - 20}
            >
              <title>{room.name}</title>
              {label}
            </text>
            <line x1={24} y1={y + 34} x2={layout.gx} y2={y + 34} stroke={GRID} strokeWidth={0.75} />
            <title>{`${index + 1}. ${room.name}`}</title>
          </g>
        );
      })}

      {layout.zoneBlocks.map((block) => {
        const zone = zoneDefinition(block.zone);
        const rowsInBlock = block.end - block.start + 1;
        const code = zone?.short ?? block.zone;
        return (
          <g key={`${block.zone}-${block.start}`} className="plate-zone">
            {/* One triangle per zone: it already contains the left-edge half rhombi. */}
            <polygon
              points={pointsAttribute(block.points)}
              fill={zone?.color ?? "#d9d6cf"}
              fillOpacity={0.42}
              stroke="none"
            />
            <rect
              x={24}
              y={layout.top + block.start * 34}
              width={34}
              height={rowsInBlock * 34}
              fill={zone?.color ?? "#d9d6cf"}
            />
            {rowsInBlock === 1 ? (
              <text
                x={41}
                y={layout.top + block.start * 34 + 22}
                fill={zone?.ink ?? INK}
                fontSize={code.length === 4 ? 9 : 10}
                fontWeight={700}
                textAnchor="middle"
                data-fit-width={32}
              >
                {code}
              </text>
            ) : (
              <text
                x={41}
                y={
                  layout.top + block.start * 34 + (rowsInBlock * 34) / 2 - (code.length - 1) * 5 + 3
                }
                fill={zone?.ink ?? INK}
                fontSize={9}
                fontWeight={700}
                textAnchor="middle"
                data-fit-width={30}
              >
                {code.split("").map((letter: string, index: number) => (
                  <tspan key={letter + index} x={41} dy={index ? 10 : 0}>
                    {letter}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        );
      })}

      {layout.cells.map((cell) => {
        const a = ordered[cell.i];
        const b = ordered[cell.j];
        const relation = getRelation(matrix, a.id, b.id);
        const trace = cellIsTrace(cell, traceRoomIds);
        const label = `${a.name} con ${b.name}: ${relationLabel[relation]} (${relation === "innecesaria" ? 0 : relation === "necesaria" ? 4 : 2})`;
        const className = `plate-cell${trace ? " is-trace" : ""}`;
        return (
          <g
            key={pairKey(a.id, b.id)}
            className={className}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? label : undefined}
            data-pair={pairKey(a.id, b.id)}
            data-relation={relation}
            onClick={() => {
              onSelectPair?.(a.id, b.id);
              if (interactive) onCycle?.(a.id, b.id);
            }}
            onKeyDown={(event) => handleKeyDown(event, a.id, b.id)}
            onMouseEnter={() => setTraceRoomIds(new Set([a.id, b.id]))}
            onFocus={() => setTraceRoomIds(new Set([a.id, b.id]))}
          >
            <polygon
              points={pointsAttribute(cell.points)}
              fill="none"
              stroke={GRID}
              strokeWidth={0.75}
            />
            {relation !== "innecesaria" && (
              <text
                x={cell.cx}
                y={cell.cy + 4.5}
                textAnchor="middle"
                fill={relation === "necesaria" ? INK : "#4a4a4a"}
                fontSize={13}
                fontWeight={650}
                data-fit-width={h * 1.6}
              >
                {relation === "necesaria" ? 4 : 2}
              </text>
            )}
          </g>
        );
      })}

      {layout.sumCells.map((cell) => {
        const traced = traceRoomIds.has(cell.aId);
        return (
          <g
            key={`sum-${cell.aId}`}
            className={traced ? "plate-functional-cell is-trace" : "plate-functional-cell"}
          >
            <polygon
              points={pointsAttribute(cell.points)}
              fill="#ffffff"
              stroke={INK}
              strokeWidth={1.25}
            />
            <text
              x={cell.cx}
              y={cell.cy + 4}
              textAnchor="middle"
              fill={INK}
              fontSize={12}
              fontWeight={600}
              data-fit-width={h * 1.8}
            >
              {cell.value}
            </text>
          </g>
        );
      })}
      {layout.rankCells.map((cell) => {
        const traced = traceRoomIds.has(cell.aId);
        // With no relations everyone ties at 0: no room is "rank 1" yet.
        const ranked = rankingById.get(cell.aId);
        const isTop = ranked?.rank === 1 && ranked.sum > 0;
        return (
          <g
            key={`rank-${cell.aId}`}
            className={traced ? "plate-functional-cell is-trace" : "plate-functional-cell"}
          >
            <polygon
              points={pointsAttribute(cell.points)}
              fill="#ffffff"
              stroke={INK}
              strokeWidth={1.25}
            />
            {isTop && <circle cx={cell.cx} cy={cell.cy} r={h * 0.68} fill={ACCENT} />}
            <text
              x={cell.cx}
              y={cell.cy + 4}
              textAnchor="middle"
              fill={isTop ? "#ffffff" : INK}
              fontSize={12}
              fontWeight={600}
              data-fit-width={h * 1.8}
            >
              {cell.value}
            </text>
          </g>
        );
      })}
      {ordered.length >= 2 ? (
        <>
          <text
            x={layout.labels.sumatoria.x}
            y={layout.labels.sumatoria.y}
            fill={MUTED}
            fontSize={10}
            letterSpacing=".14em"
            textAnchor="end"
            transform={`rotate(-45 ${layout.labels.sumatoria.x} ${layout.labels.sumatoria.y})`}
            data-fit-width={90}
          >
            SUMATORIA
          </text>
          <text
            x={layout.labels.rango.x}
            y={layout.labels.rango.y}
            fill={MUTED}
            fontSize={10}
            letterSpacing=".14em"
            textAnchor="end"
            transform={`rotate(-45 ${layout.labels.rango.x} ${layout.labels.rango.y})`}
            data-fit-width={60}
          >
            RANGO
          </text>
        </>
      ) : (
        <text
          x={layout.gx + 18}
          y={layout.top + 70}
          fill={MUTED}
          fontSize={12}
          data-fit-width={200}
        >
          Añade otro ambiente para dibujar la retícula.
        </text>
      )}

      <g className="plate-summary">
        <text
          x={layout.side.x}
          y={layout.side.y + 18}
          fill={INK}
          fontSize={11}
          fontWeight={700}
          letterSpacing=".04em"
          data-fit-width={SIDE_COL - 4}
        >
          RANGO
        </text>
        <text
          x={layout.side.x + SIDE_COL}
          y={layout.side.y + 18}
          fill={INK}
          fontSize={11}
          fontWeight={700}
          letterSpacing=".04em"
          data-fit-width={W - SIDE_COL}
        >
          AMBIENTE
        </text>
        {layout.side.lines.map((line, index) => (
          <g key={`${line.rank}-${index}`}>
            <text
              x={layout.side.x}
              y={line.y}
              fill={INK}
              fontSize={12}
              fontWeight={line.first ? 700 : 400}
              data-fit-width={SIDE_COL - 4}
            >
              {line.first ? `R${line.rank}:` : ""}
            </text>
            <text
              x={layout.side.x + SIDE_COL}
              y={line.y}
              fill={INK}
              fontSize={12}
              data-fit-width={W - SIDE_COL}
            >
              {line.text}
            </text>
          </g>
        ))}
        <text
          x={layout.side.x}
          y={layout.side.legend.y + 14}
          fill={INK}
          fontSize={11}
          fontWeight={700}
          letterSpacing=".08em"
          data-fit-width={W}
        >
          PONDERACIÓN
        </text>
        <polygon
          points={pointsAttribute([
            { x: layout.side.x + 9, y: layout.side.legend.y + 34 - h / 2 },
            { x: layout.side.x + 9 + h / 2, y: layout.side.legend.y + 34 },
            { x: layout.side.x + 9, y: layout.side.legend.y + 34 + h / 2 },
            { x: layout.side.x + 9 - h / 2, y: layout.side.legend.y + 34 },
          ])}
          fill="#ffffff"
          stroke={GRID}
          strokeWidth={0.75}
        />
        <text
          x={layout.side.x + 9}
          y={layout.side.legend.y + 38}
          textAnchor="middle"
          fill={INK}
          fontSize={11}
          fontWeight={650}
          data-fit-width={18}
        >
          4
        </text>
        <text
          x={layout.side.x + 26}
          y={layout.side.legend.y + 38}
          fill={INK}
          fontSize={11}
          data-fit-width={W - 26}
        >
          RELACIÓN NECESARIA
        </text>
        <polygon
          points={pointsAttribute([
            { x: layout.side.x + 9, y: layout.side.legend.y + 58 - h / 2 },
            { x: layout.side.x + 9 + h / 2, y: layout.side.legend.y + 58 },
            { x: layout.side.x + 9, y: layout.side.legend.y + 58 + h / 2 },
            { x: layout.side.x + 9 - h / 2, y: layout.side.legend.y + 58 },
          ])}
          fill="#ffffff"
          stroke={GRID}
          strokeWidth={0.75}
        />
        <text
          x={layout.side.x + 9}
          y={layout.side.legend.y + 62}
          textAnchor="middle"
          fill="#4a4a4a"
          fontSize={11}
          fontWeight={650}
          data-fit-width={18}
        >
          2
        </text>
        <text
          x={layout.side.x + 26}
          y={layout.side.legend.y + 62}
          fill={INK}
          fontSize={11}
          data-fit-width={W - 26}
        >
          RELACIÓN DESEABLE
        </text>
        <text
          x={layout.side.x}
          y={layout.side.legend.y + 86}
          fill={MUTED}
          fontSize={11}
          data-fit-width={W}
        >
          Vacío: innecesaria (0)
        </text>
      </g>
    </svg>
  );
}
