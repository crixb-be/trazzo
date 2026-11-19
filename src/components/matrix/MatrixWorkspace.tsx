"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RelationPlate } from "@/components/matrix/RelationPlate";
import { SaveToProject } from "@/components/ui/SaveToProject";
import { ShareResult } from "@/components/ui/ShareResult";
import { db } from "@/lib/offline/db";
import { matrixResultSheet } from "@/lib/share/workspace-sheets";
import {
  computeRanking,
  cycleRelation,
  getRelation,
  METHOD_EXAMPLE,
  METHOD_WEIGHTS,
  normalizeMatrix,
  orderedRooms,
  pairKey,
  rankGroups,
  removeRoom,
  setRelation,
  setRoomZone,
  type Relation,
  type RelationMatrix,
  type Zone,
  ZONES,
} from "@/lib/matrix/relations";

const relationOptions: Array<{ value: Relation; label: string }> = [
  { value: "necesaria", label: "Necesaria (4)" },
  { value: "deseable", label: "Deseable (2)" },
  { value: "innecesaria", label: "Vacía (0)" },
];

const initial: RelationMatrix = {
  rooms: [
    { id: "sala", name: "Sala", zone: "social" },
    { id: "comedor", name: "Comedor", zone: "semisocial" },
    { id: "cocina", name: "Cocina", zone: "servicio" },
    { id: "dormitorio", name: "Dormitorio", zone: "privada" },
  ],
  relations: {},
  weights: { ...METHOD_WEIGHTS },
};

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function orderedPairs(matrix: RelationMatrix): Array<[string, string, Relation]> {
  const rooms = orderedRooms(matrix);
  return rooms.flatMap((room, index) =>
    rooms
      .slice(index + 1)
      .map(
        (other) =>
          [room.id, other.id, getRelation(matrix, room.id, other.id)] as [string, string, Relation],
      ),
  );
}

export function MatrixWorkspace() {
  const [matrix, setMatrix] = useState<RelationMatrix>(initial);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [zone, setZone] = useState<Zone>("social");
  const [selectedA, setSelectedA] = useState("sala");
  const [selectedB, setSelectedB] = useState("comedor");
  const [notice, setNotice] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const saveQueue = useRef(Promise.resolve());
  const rooms = useMemo(() => orderedRooms(matrix), [matrix]);
  const ranking = useMemo(() => computeRanking(matrix), [matrix]);
  const groups = useMemo(() => rankGroups(ranking), [ranking]);
  const sheet = useMemo(() => matrixResultSheet(matrix, ranking), [matrix, ranking]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const saved = await db?.meta.get("relation-matrix");
        if (saved && active) setMatrix(normalizeMatrix(JSON.parse(saved.value)));
        if (active) setReady(true);
      } catch {
        if (active) {
          setNotice("No se pudo leer la matriz guardada. Recarga para reintentar.");
          setReady(true);
        }
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
        await db!.meta.put({
          key: "relation-matrix",
          value: JSON.stringify(normalizeMatrix(matrix)),
        });
        setNotice("Guardado en este dispositivo");
      })
      .catch(() => setNotice("No se pudo guardar. Conserva una exportación e inténtalo de nuevo."));
  }, [matrix, ready]);

  useEffect(() => {
    const a = rooms.some((room) => room.id === selectedA) ? selectedA : (rooms[0]?.id ?? "");
    const b = rooms.some((room) => room.id === selectedB && room.id !== a)
      ? selectedB
      : (rooms.find((room) => room.id !== a)?.id ?? "");
    if (a !== selectedA) setSelectedA(a);
    if (b !== selectedB) setSelectedB(b);
  }, [rooms, selectedA, selectedB]);

  function addRoom(event: React.FormEvent): void {
    event.preventDefault();
    const value = name.trim();
    if (!value || matrix.rooms.length >= 20) return;
    if (matrix.rooms.some((room) => room.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setNotice("Ya existe un ambiente con ese nombre.");
      return;
    }
    setMatrix((current) => ({
      ...current,
      rooms: [...current.rooms, { id: crypto.randomUUID(), name: value, zone }],
    }));
    setName("");
  }

  function changeRelation(aId: string, bId: string, relation: Relation): void {
    setSelectedA(aId);
    setSelectedB(bId);
    setMatrix((current) => setRelation(current, aId, bId, relation));
  }

  function cyclePair(aId: string, bId: string): void {
    changeRelation(aId, bId, cycleRelation(getRelation(matrix, aId, bId)));
  }

  function loadExample(): void {
    if (
      Object.keys(matrix.relations).length &&
      !window.confirm("¿Reemplazar la matriz actual con el ejemplo?")
    )
      return;
    setMatrix({
      rooms: METHOD_EXAMPLE.rooms.map((room) => ({ ...room })),
      relations: { ...METHOD_EXAMPLE.relations },
      weights: { ...METHOD_WEIGHTS },
    });
  }

  /** The plate as a self-contained drawing: no UI state, no on-screen sizing. */
  function standaloneMarkup(plate: SVGSVGElement): string {
    const clone = plate.cloneNode(true) as SVGSVGElement;
    for (const element of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
      for (const name of ["tabindex", "role", "class", "style", "aria-label", "data-fit-width"])
        element.removeAttribute(name);
    }
    return new XMLSerializer().serializeToString(clone);
  }

  function exportSvg(): void {
    if (!svg.current) return;
    download(
      new Blob([standaloneMarkup(svg.current)], { type: "image/svg+xml" }),
      "trazo-relaciones.svg",
    );
  }

  async function exportPdf(): Promise<void> {
    if (!svg.current) return;
    try {
      const plate = svg.current;
      const viewBox = plate.viewBox.baseVal;
      const markup = standaloneMarkup(plate);
      const image = new Image();
      const imageUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = imageUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewBox.width * 2);
      canvas.height = Math.round(viewBox.height * 2);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("TRAZO · Matriz de relaciones ponderadas", margin, 15);
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - 25;
      const scale = Math.min(maxWidth / viewBox.width, maxHeight / viewBox.height);
      const width = viewBox.width * scale;
      const height = viewBox.height * scale;
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin + (maxWidth - width) / 2,
        20,
        width,
        height,
      );
      pdf.addPage();
      autoTable(pdf, {
        head: [["Rango", "Ambiente", "Zona", "Sumatoria"]],
        body: ranking.map((room) => [
          `R${room.rank}`,
          room.name,
          ZONES.find((item) => item.id === room.zone)?.label ?? room.zone,
          room.sum,
        ]),
      });
      const finalY =
        (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30;
      autoTable(pdf, {
        startY: finalY + 10,
        head: [["Ambiente A", "Ambiente B", "Relación", "Valor"]],
        body: orderedPairs(matrix)
          .filter(([, , relation]) => relation !== "innecesaria")
          .map(([aId, bId, relation]) => {
            const a = matrix.rooms.find((room) => room.id === aId)!;
            const b = matrix.rooms.find((room) => room.id === bId)!;
            return [a.name, b.name, relation, METHOD_WEIGHTS[relation]];
          }),
      });
      pdf.save("trazo-relaciones.pdf");
    } catch {
      setNotice("No se pudo exportar. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="matrix-workspace">
      <div className="eyebrow">Programa / Anteproyecto</div>
      <h1 className="page-title">Matriz de relaciones</h1>
      <p className="lead">
        Necesaria vale 4, Deseable vale 2 y vacío vale 0; la sumatoria y el rango orientan la
        diagramación, no son una planta.
      </p>
      <p className="matrix-notice muted small" role="status">
        {notice}
      </p>

      <div className="matrix-workspace-layout">
        <fieldset disabled={!ready} className="matrix-controls">
          <legend>Ambientes y zonas</legend>
          <form onSubmit={addRoom} className="matrix-add-room">
            <label>
              Nuevo ambiente
              <input
                className="input"
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Zona
              <select
                className="select"
                aria-label="Zona"
                value={zone}
                onChange={(event) => setZone(event.target.value as Zone)}
              >
                {ZONES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || matrix.rooms.length >= 20}
            >
              Añadir ambiente
            </button>
          </form>
          <p className="muted">
            Hasta 20 ambientes. Cambia la zona para ordenar la lámina por áreas.
          </p>
          <div className="matrix-room-groups">
            {ZONES.map((item) => {
              const zoneRooms = matrix.rooms.filter((room) => room.zone === item.id);
              if (!zoneRooms.length) return null;
              return (
                <section
                  key={item.id}
                  className="matrix-room-group"
                  style={{ borderLeftColor: item.color }}
                >
                  <h3>{item.label}</h3>
                  {zoneRooms.map((room) => (
                    <div className="matrix-room" key={room.id}>
                      <label>
                        <span className="matrix-sr-only">Nombre de {room.name}</span>
                        <input
                          className="input"
                          maxLength={40}
                          aria-label={`Nombre de ${room.name}`}
                          value={room.name}
                          onChange={(event) =>
                            setMatrix((current) => ({
                              ...current,
                              rooms: current.rooms.map((candidate) =>
                                candidate.id === room.id
                                  ? { ...candidate, name: event.target.value }
                                  : candidate,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span className="matrix-sr-only">Zona de {room.name}</span>
                        <select
                          className="select"
                          aria-label={`Zona de ${room.name}`}
                          value={room.zone}
                          onChange={(event) =>
                            setMatrix((current) =>
                              setRoomZone(current, room.id, event.target.value as Zone),
                            )
                          }
                        >
                          {ZONES.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Eliminar ${room.name}`}
                        onClick={() => setMatrix((current) => removeRoom(current, room.id))}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
          <div className="matrix-control-actions">
            <button type="button" className="btn btn-sm" onClick={loadExample}>
              Cargar ejemplo
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setMatrix((current) => ({ ...current, relations: {} }))}
            >
              Limpiar relaciones
            </button>
          </div>
          <h2 className="matrix-subtitle">Seleccionar un par</h2>
          <div className="matrix-pair-selectors">
            <label>
              Ambiente A
              <select
                className="select"
                value={selectedA}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedA(value);
                  if (value === selectedB)
                    setSelectedB(rooms.find((room) => room.id !== value)?.id ?? "");
                }}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ambiente B
              <select
                className="select"
                value={selectedB}
                onChange={(event) => setSelectedB(event.target.value)}
              >
                {rooms
                  .filter((room) => room.id !== selectedA)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {selectedA && selectedB ? (
            <fieldset className="relation-radio-fieldset">
              <legend>Relación</legend>
              <div className="relation-radio-group" role="radiogroup" aria-label="Relación">
                {relationOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="relation"
                      value={option.value}
                      checked={getRelation(matrix, selectedA, selectedB) === option.value}
                      onChange={() => changeRelation(selectedA, selectedB, option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </fieldset>

        <section className="matrix-plate-panel" aria-label="Lámina de relaciones">
          <p className="matrix-plate-hint">Toca un rombo para alternar 4 → 2 → vacío</p>
          <div className="matrix-plate-scroll diagram-scope matrix-workspace">
            <RelationPlate
              matrix={matrix}
              interactive={ready}
              onCycle={cyclePair}
              onSelectPair={(aId, bId) => {
                setSelectedA(aId);
                setSelectedB(bId);
              }}
              svgRef={svg}
            />
          </div>
          <section className="matrix-ranking-table">
            <h2 className="matrix-subtitle">Rango de conexión</h2>
            <div className="matrix-table-scroll">
              <table>
                <caption>Ordenado por rango; sumatorias iguales comparten rango</caption>
                <thead>
                  <tr>
                    <th scope="col">Rango</th>
                    <th scope="col">Ambiente</th>
                    <th scope="col">Zona</th>
                    <th scope="col">Sumatoria</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Stable sort: ties keep the plate's zone order. */}
                  {[...ranking]
                    .sort((a, b) => a.rank - b.rank)
                    .map((room) => (
                      <tr key={room.id} data-rank={room.rank}>
                        <td>R{room.rank}</td>
                        <td>{room.name}</td>
                        <td>
                          <span
                            className="zone-dot"
                            style={{
                              backgroundColor: ZONES.find((item) => item.id === room.zone)?.color,
                            }}
                          />
                          {ZONES.find((item) => item.id === room.zone)?.label}
                        </td>
                        <td>{room.sum}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>

      <div className="hero-actions matrix-actions">
        <ShareResult sheet={sheet} diagramScope=".matrix-workspace" />
        <SaveToProject sheet={sheet} />
        <button type="button" className="btn" disabled={!ready} onClick={exportSvg}>
          Exportar imagen SVG
        </button>
        <button type="button" className="btn" disabled={!ready} onClick={() => void exportPdf()}>
          Exportar PDF
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Imprimir lámina
        </button>
      </div>
    </div>
  );
}
