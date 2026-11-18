"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/offline/db";
import {
  DEFAULT_WEIGHTS,
  diagramNodes,
  getRelation,
  pairKey,
  rankRooms,
  removeRoom,
  type Relation,
  type RelationMatrix,
} from "@/lib/matrix/relations";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { matrixResultSheet } from "@/lib/share/workspace-sheets";

const kinds: Relation[] = ["necesaria", "deseable", "innecesaria"];
const initial: RelationMatrix = {
  rooms: [
    { id: "sala", name: "Sala" },
    { id: "cocina", name: "Cocina" },
    { id: "comedor", name: "Comedor" },
  ],
  relations: {},
  weights: DEFAULT_WEIGHTS,
};
const colors = { necesaria: "#b5822f", deseable: "#4479a7", innecesaria: "#999" };

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MatrixWorkspace() {
  const [matrix, setMatrix] = useState<RelationMatrix>(initial);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const saved = await db?.meta.get("relation-matrix");
        if (saved && active) {
          const parsed = JSON.parse(saved.value) as RelationMatrix;
          if (!Array.isArray(parsed.rooms) || !parsed.weights || !parsed.relations)
            throw new Error();
          setMatrix(parsed);
        }
        if (active) setReady(true);
      } catch {
        if (active) setNotice("No se pudo leer la matriz guardada. Recarga para reintentar.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !db) return;
    setNotice("Guardando…");
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        await db!.meta.put({ key: "relation-matrix", value: JSON.stringify(matrix) });
        setNotice("Guardado en este dispositivo");
      })
      .catch(() => {
        setNotice("No se pudo guardar. Conserva una exportación e inténtalo de nuevo.");
      });
  }, [matrix, ready]);

  const nodes = diagramNodes(matrix.rooms);
  const ranking = rankRooms(matrix);
  const sheet = matrixResultSheet(matrix, ranking);
  function addRoom(event: React.FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value || matrix.rooms.length >= 20) return;
    if (matrix.rooms.some((room) => room.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setNotice("Ya existe un ambiente con ese nombre.");
      return;
    }
    setMatrix((current) => ({
      ...current,
      rooms: [...current.rooms, { id: crypto.randomUUID(), name: value }],
    }));
    setName("");
  }
  async function exportMatrix(format: "svg" | "pdf") {
    if (!svg.current) return;
    try {
      const markup = new XMLSerializer().serializeToString(svg.current);
      if (format === "svg") {
        download(new Blob([markup], { type: "image/svg+xml" }), "trazo-relaciones.svg");
        return;
      }
      const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = reject;
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1400;
        const context = canvas.getContext("2d");
        if (!context) throw new Error();
        context.drawImage(image, 0, 0, 1600, 1400);
        const [{ jsPDF }, { autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);
        const pdf = new jsPDF();
        pdf.text("TRAZO · Matriz de relaciones", 14, 18);
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 25, 190, 166);
        autoTable(pdf, {
          startY: 198,
          head: [["Ambiente", "Ponderación"]],
          body: ranking.map((room) => [room.name, room.score]),
        });
        pdf.addPage();
        autoTable(pdf, {
          head: [["Ambiente 1", "Ambiente 2", "Relación", "Peso"]],
          body: matrix.rooms.flatMap((room, i) =>
            matrix.rooms.slice(i + 1).map((other) => {
              const relation = getRelation(matrix, room.id, other.id);
              return [room.name, other.name, relation, matrix.weights[relation]];
            }),
          ),
        });
        pdf.save("trazo-relaciones.pdf");
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setNotice("No se pudo exportar. Inténtalo de nuevo.");
    }
  }
  return (
    <div className="matrix-workspace">
      <h1 className="page-title">Matriz de relaciones</h1>
      <p>
        Organiza los ambientes y define qué espacios deben estar cerca. La ponderación orienta
        prioridades; el diagrama no es una distribución de planta.
      </p>
      <p role="status">{notice}</p>
      <fieldset disabled={!ready} className="matrix-controls">
        <legend>Ambientes y ponderaciones</legend>
        <form onSubmit={addRoom} className="hero-actions">
          <label>
            Nuevo ambiente
            <input
              className="input"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={!name.trim() || matrix.rooms.length >= 20}>
            Añadir ambiente
          </button>
        </form>
        <p className="muted">
          Hasta 20 ambientes. Edita los nombres o elimina un ambiente; se quitarán sus relaciones.
        </p>
        <div className="field-grid">
          {matrix.rooms.map((room) => (
            <div key={room.id}>
              <label>
                Nombre de {room.name}
                <input
                  className="input"
                  maxLength={40}
                  value={room.name}
                  onChange={(event) =>
                    setMatrix((current) => ({
                      ...current,
                      rooms: current.rooms.map((item) =>
                        item.id === room.id ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <button
                className="btn"
                onClick={() => setMatrix((current) => removeRoom(current, room.id))}
                aria-label={"Eliminar " + room.name}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        <div className="field-grid">
          {kinds.map((kind) => (
            <label key={kind}>
              Peso: {kind}
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={matrix.weights[kind]}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (Number.isFinite(value))
                    setMatrix((current) => ({
                      ...current,
                      weights: {
                        ...current.weights,
                        [kind]: Math.max(0, Math.min(100, Math.round(value))),
                      },
                    }));
                }}
              />
            </label>
          ))}
        </div>
        <h2>Relaciones entre ambientes</h2>
        {matrix.rooms.length < 2 ? (
          <p>Añade al menos dos ambientes para relacionarlos.</p>
        ) : (
          <div className="matrix-scroll">
            <table className="relation-table">
              <caption>Triángulo superior · cada par se define una sola vez</caption>
              <thead>
                <tr>
                  <th scope="col">Ambiente</th>
                  {matrix.rooms.map((room) => (
                    <th scope="col" key={room.id}>
                      {room.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rooms.map((room, i) => (
                  <tr key={room.id}>
                    <th scope="row">{room.name}</th>
                    {matrix.rooms.map((other, j) => (
                      <td key={other.id}>
                        {j > i ? (
                          <select
                            className="input"
                            aria-label={room.name + " con " + other.name}
                            value={getRelation(matrix, room.id, other.id)}
                            onChange={(event) =>
                              setMatrix((current) => ({
                                ...current,
                                relations: {
                                  ...current.relations,
                                  [pairKey(room.id, other.id)]: event.target.value as Relation,
                                },
                              }))
                            }
                          >
                            {kinds.map((kind) => (
                              <option key={kind}>{kind}</option>
                            ))}
                          </select>
                        ) : (
                          "—"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>
      <h2>Prioridad de conexión</h2>
      <ol>
        {ranking.map((room) => (
          <li key={room.id}>
            {room.name || "Sin nombre"}: <strong>{room.score}</strong>
          </li>
        ))}
      </ol>
      <div className="hero-actions">
        <ShareResult sheet={sheet} diagramScope=".matrix-workspace" />
        <SaveToProject sheet={sheet} />
        <button className="btn" disabled={!ready} onClick={() => void exportMatrix("svg")}>
          Exportar imagen SVG
        </button>
        <button className="btn" disabled={!ready} onClick={() => void exportMatrix("pdf")}>
          Exportar PDF
        </button>
      </div>
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        width="800"
        height="700"
        viewBox="0 0 800 700"
        className="relation-diagram"
        role="img"
        aria-label="Diagrama de relaciones: línea continua necesaria, discontinua deseable"
      >
        <rect width="800" height="700" fill="#fff" />
        <text x="20" y="25" fontSize="16" fill="#222">
          TRAZO · Relaciones entre ambientes
        </text>
        <text x="20" y="50" fontSize="13" fill="#444">
          Continua: necesaria · Discontinua: deseable · Sin línea: innecesaria
        </text>
        {nodes.flatMap((node, i) =>
          nodes.slice(i + 1).map((other) => {
            const relation = getRelation(matrix, node.id, other.id);
            return relation === "innecesaria" ? null : (
              <line
                key={pairKey(node.id, other.id)}
                x1={node.x}
                y1={node.y}
                x2={other.x}
                y2={other.y}
                stroke={colors[relation]}
                strokeWidth={relation === "necesaria" ? 4 : 2}
                strokeDasharray={relation === "deseable" ? "8 6" : undefined}
              />
            );
          }),
        )}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="24" fill="#f6f5f2" stroke="#333" />
            <text x={node.x} y={node.y + 5} textAnchor="middle" fill="#222" fontSize="13">
              {matrix.rooms.findIndex((room) => room.id === node.id) + 1}
            </text>
            <text x={node.x} y={node.y + 42} textAnchor="middle" fill="#222" fontSize="13">
              {node.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
