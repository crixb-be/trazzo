"use client";

import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import type { Material } from "@/data/seed-rne";
import type { Takeoff } from "@/lib/offline/db";
import { computeTakeoffLine } from "@/lib/calculators/takeoff";

export interface TakeoffDraft {
  id?: string;
  partName: string;
  materialCode: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  wastePct: number;
}

export interface TakeoffTableProps {
  takeoffs: Takeoff[];
  materials: Material[];
  draft: TakeoffDraft;
  setDraft: (draft: TakeoffDraft) => void;
  onSave: () => void;
  onEdit: (takeoff: Takeoff) => void;
  onDelete: (takeoff: Takeoff) => void;
}

function materialFor(code: string, materials: Material[]): Material {
  return materials.find((material) => material.code === code) ?? materials[0];
}

function derivedLine(draft: TakeoffDraft, materials: Material[]) {
  const material = materialFor(draft.materialCode, materials);
  return computeTakeoffLine({
    materialCode: material.code,
    unit: material.unit,
    length: draft.length,
    width: draft.width,
    height: draft.height,
    quantity: draft.quantity,
    yieldFactor: material.yield_factor,
    wastePct: draft.wastePct,
    unitPrice: material.ref_price_pen,
  }).values;
}

export function TakeoffTable({
  takeoffs,
  materials,
  draft,
  setDraft,
  onSave,
  onEdit,
  onDelete,
}: TakeoffTableProps) {
  const preview = materials.length ? derivedLine(draft, materials) : null;
  const categories = [...new Set(materials.map((material) => material.category))];

  return (
    <Card className="takeoff-card">
      <div className="section-heading">
        <div>
          <div className="eyebrow">PARTIDAS / METRADO</div>
          <h2>{draft.id ? "Editar partida" : "Agregar partida"}</h2>
        </div>
        {draft.id && (
          <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, id: undefined })}>
            <X size={14} /> Cancelar edición
          </Button>
        )}
      </div>
      {materials.length === 0 ? (
        <p className="muted">Cargando catálogo de materiales…</p>
      ) : (
        <>
          <div className="takeoff-form">
            <div className="field">
              <label htmlFor="part-name">Partida</label>
              <Input
                id="part-name"
                value={draft.partName}
                onChange={(event) => setDraft({ ...draft, partName: event.target.value })}
                placeholder="Muro de soga"
              />
            </div>
            <div className="field">
              <label htmlFor="material-code">Material</label>
              <select
                id="material-code"
                className="select"
                value={draft.materialCode}
                onChange={(event) => {
                  const material = materialFor(event.target.value, materials);
                  setDraft({
                    ...draft,
                    materialCode: event.target.value,
                    wastePct: material.default_waste_pct,
                  });
                }}
              >
                <option value="">Selecciona un material</option>
                {categories.map((category) => (
                  <optgroup label={category} key={category}>
                    {materials
                      .filter((material) => material.category === category)
                      .map((material) => (
                        <option value={material.code} key={material.code}>
                          {material.name} · {material.unit} · S/ {material.ref_price_pen.toFixed(2)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <NumberInput
              label="Largo"
              value={draft.length}
              onChange={(value) => setDraft({ ...draft, length: value })}
            />
            <NumberInput
              label="Ancho"
              value={draft.width}
              onChange={(value) => setDraft({ ...draft, width: value })}
            />
            <NumberInput
              label="Alto"
              value={draft.height}
              onChange={(value) => setDraft({ ...draft, height: value })}
            />
            <NumberInput
              label="Cantidad"
              value={draft.quantity}
              onChange={(value) => setDraft({ ...draft, quantity: value })}
            />
            <NumberInput
              label="% desperdicio"
              value={draft.wastePct}
              onChange={(value) => setDraft({ ...draft, wastePct: value })}
            />
            <div className="takeoff-preview">
              <span className="muted small">Total con desperdicio</span>
              <strong className="mono">
                {preview?.total.toFixed(2) ?? "—"} {preview?.unit ?? ""}
              </strong>
            </div>
            <Button variant="primary" onClick={onSave}>
              {draft.id ? <Save size={15} /> : <Plus size={15} />}
              {draft.id ? "Guardar cambios" : "Agregar partida"}
            </Button>
          </div>

          {takeoffs.length === 0 ? (
            <div className="empty-table">
              <p>Aún no hay partidas en este proyecto.</p>
              <span className="muted small">Agrega una partida para empezar el presupuesto.</span>
            </div>
          ) : (
            <div className="table-wrap takeoff-table-wrap">
              <table className="data-table takeoff-table">
                <thead>
                  <tr>
                    <th>Partida</th>
                    <th>Material</th>
                    <th>L</th>
                    <th>A</th>
                    <th>H</th>
                    <th>Cant.</th>
                    <th>Merma</th>
                    <th>Total</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {takeoffs.map((takeoff) => {
                    const material = materialFor(takeoff.materialCode, materials);
                    return (
                      <tr key={takeoff.id}>
                        <td>{takeoff.partName}</td>
                        <td>
                          <span className="mono small">{material.code}</span>
                          <small>{material.name}</small>
                        </td>
                        <td>{takeoff.length.toFixed(2)}</td>
                        <td>{takeoff.width.toFixed(2)}</td>
                        <td>{takeoff.height.toFixed(2)}</td>
                        <td>{takeoff.quantity.toFixed(2)}</td>
                        <td>{takeoff.wastePct}%</td>
                        <td className="mono">
                          {takeoff.total.toFixed(2)} {material.unit}
                        </td>
                        <td className="mono">S/ {takeoff.subtotalPen.toFixed(2)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              onClick={() => onEdit(takeoff)}
                              aria-label="Editar partida"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(takeoff)}
                              aria-label="Eliminar partida"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field compact-field">
      <label>{label}</label>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
