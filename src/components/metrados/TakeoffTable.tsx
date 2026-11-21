"use client";

import { useEffect, useRef, useState } from "react";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { Button, Card, Input, LoadingState, NumberField } from "@/components/ui";
import type { Material } from "@/data/seed-rne";
import type { Takeoff } from "@/lib/offline/db";
import { computeTakeoffLine } from "@/lib/calculators/takeoff";

export interface TakeoffDraft {
  id?: string;
  partName: string;
  materialCode: string;
  length: number | null;
  width: number | null;
  height: number | null;
  quantity: number | null;
  wastePct: number | null;
  unitPricePen: number | null;
}

export interface TakeoffTableProps {
  takeoffs: Takeoff[];
  materials: Material[];
  draft: TakeoffDraft;
  setDraft: (draft: TakeoffDraft) => void;
  /** Leaves edit mode and clears the form, so saving cannot create a duplicate. */
  onCancelEdit: () => void;
  onSave: (
    line: Omit<Takeoff, "projectId" | "id" | "updatedAt" | "syncState"> & { id?: string },
  ) => Promise<boolean>;
  onEdit: (takeoff: Takeoff) => void;
  onDelete: (takeoff: Takeoff) => void;
}

function materialFor(code: string, materials: Material[]): Material {
  return materials.find((material) => material.code === code) ?? materials[0];
}

export function TakeoffTable({
  takeoffs,
  materials,
  draft,
  setDraft,
  onCancelEdit,
  onSave,
  onEdit,
  onDelete,
}: TakeoffTableProps) {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const partNameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (draft.id) partNameInput.current?.focus();
  }, [draft.id]);
  const chapter = draft.partName.match(/^\[([^\]]+)\]/)?.[1] ?? "";
  const partName = draft.partName.replace(/^\[[^\]]+\]\s*/, "").trim();
  const material = materials.find((item) => item.code === draft.materialCode);
  const unit = material?.unit;
  const hasArea = unit === "m2" || unit === "m3";
  const dimensions = hasArea ? [draft.length, draft.width] : [draft.quantity];
  if (unit === "m3") dimensions.push(draft.height);
  const measuresValid = dimensions.every((value) => (value ?? 0) > 0);
  const length = hasArea ? (draft.length ?? 0) : 0;
  const width = hasArea ? (draft.width ?? 0) : 0;
  const height = unit === "m3" ? (draft.height ?? 0) : 0;
  const result =
    material && measuresValid && draft.wastePct !== null && draft.unitPricePen !== null
      ? computeTakeoffLine({
          materialCode: material.code,
          unit: material.unit,
          length,
          width,
          height,
          quantity: hasArea ? undefined : (draft.quantity ?? 0),
          yieldFactor: material.yield_factor,
          wastePct: draft.wastePct,
          unitPrice: draft.unitPricePen,
        })
      : null;
  const preview = result?.ok && Number.isFinite(result.values.subtotalPen) ? result.values : null;
  const categories = [...new Set(materials.map((item) => item.category))];
  const nameError = submitted && !partName;
  const materialError = submitted && !material;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (
      saving ||
      !material ||
      !partName ||
      !preview ||
      draft.wastePct === null ||
      draft.unitPricePen === null
    )
      return;
    setSaving(true);
    try {
      const saved = await onSave({
        id: draft.id,
        partName: draft.partName.trim(),
        materialCode: material.code,
        length,
        width,
        height,
        quantity: preview.quantity,
        total: preview.total,
        subtotalPen: preview.subtotalPen,
        wastePct: draft.wastePct,
        unitPricePen: draft.unitPricePen,
      });
      if (saved) {
        setSubmitted(false);
        setFormVersion((version) => version + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="takeoff-card" id="partidas">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Partidas / Metrado</div>
          <h2>{draft.id ? "Editar partida" : "Agregar partida"}</h2>
        </div>
        {draft.id && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSubmitted(false);
              onCancelEdit();
            }}
          >
            <X size={14} /> Cancelar edición
          </Button>
        )}
      </div>
      {materials.length === 0 ? (
        <LoadingState label="Cargando catálogo de materiales…" rows={2} />
      ) : (
        <>
          <form key={(draft.id ?? "") + ":" + formVersion} onSubmit={(event) => void submit(event)}>
            <div className="field">
              <label htmlFor="part-chapter">Capítulo</label>
              <input
                id="part-chapter"
                className="input"
                value={draft.partName.match(/^\[([^\]]*)\]/)?.[1] ?? ""}
                onChange={(e) => {
                  const next = e.target.value.replace(/[\[\]]/g, "");
                  setDraft({
                    ...draft,
                    partName:
                      (next ? `[${next}] ` : "") + draft.partName.replace(/^\[[^\]]+\]\s*/, ""),
                  });
                }}
                placeholder="Ej. Estructuras"
              />
            </div>
            <div className="takeoff-item-fields">
              <div className="field">
                <label htmlFor="part-name">Partida</label>
                <Input
                  id="part-name"
                  ref={partNameInput}
                  value={draft.partName.replace(/^\[[^\]]+\]\s*/, "")}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      partName:
                        (chapter.trim() ? `[${chapter.replace(/[\[\]]/g, "").trim()}] ` : "") +
                        event.target.value.replace(/^\[[^\]]+\]\s*/, ""),
                    })
                  }
                  placeholder="Muro de soga"
                  aria-invalid={nameError || undefined}
                  aria-describedby={nameError ? "part-name-error" : undefined}
                />
                {nameError && (
                  <span className="field-error small" id="part-name-error">
                    Ingresa el nombre de la partida.
                  </span>
                )}
              </div>
              <div className="field">
                <label htmlFor="material-code">Material</label>
                <select
                  id="material-code"
                  className="select"
                  value={draft.materialCode}
                  aria-invalid={materialError || undefined}
                  aria-describedby={materialError ? "material-error" : undefined}
                  onChange={(event) => {
                    const material = materialFor(event.target.value, materials);
                    setDraft({
                      ...draft,
                      materialCode: event.target.value,
                      wastePct: material.default_waste_pct,
                      unitPricePen: material.ref_price_pen,
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
                            {material.name} · {material.unit} · S/{" "}
                            {material.ref_price_pen.toFixed(2)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {materialError && (
                  <span className="field-error small" id="material-error">
                    Selecciona un material.
                  </span>
                )}
              </div>
            </div>
            <div className="takeoff-number-fields">
              {["m2", "m3"].includes(unit ?? "") && (
                <>
                  <NumberInput
                    label="Largo"
                    value={draft.length}
                    submitted={submitted}
                    onChange={(value) => setDraft({ ...draft, length: value })}
                  />
                  <NumberInput
                    label="Ancho"
                    value={draft.width}
                    submitted={submitted}
                    onChange={(value) => setDraft({ ...draft, width: value })}
                  />
                </>
              )}
              {unit === "m3" && (
                <NumberInput
                  label="Alto"
                  value={draft.height}
                  submitted={submitted}
                  onChange={(value) => setDraft({ ...draft, height: value })}
                />
              )}
              {!["m2", "m3"].includes(unit ?? "") && (
                <NumberInput
                  label="Cantidad"
                  value={draft.quantity}
                  submitted={submitted}
                  onChange={(value) => setDraft({ ...draft, quantity: value })}
                />
              )}
              <NumberField
                label="% desperdicio"
                value={draft.wastePct}
                min={0}
                error={submitted && draft.wastePct === null ? "Ingresa la merma." : undefined}
                onValueChange={(value) => setDraft({ ...draft, wastePct: value })}
              />
              <NumberField
                label="Precio unitario (S/)"
                value={draft.unitPricePen}
                min={0}
                error={
                  submitted && draft.unitPricePen === null
                    ? "Ingresa el precio unitario."
                    : undefined
                }
                onValueChange={(value) => setDraft({ ...draft, unitPricePen: value })}
              />
            </div>
            <div className="takeoff-reference">
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    unitPricePen: materialFor(draft.materialCode, materials).ref_price_pen,
                  })
                }
              >
                Usar precio referencial
              </button>
            </div>
            <div className="takeoff-actions">
              <div className="takeoff-preview">
                <span className="muted small">Total con desperdicio</span>
                <strong className="mono">
                  {preview?.total.toFixed(2) ?? "—"} {preview?.unit ?? ""}
                </strong>
              </div>
              <Button variant="primary" type="submit" disabled={saving}>
                {draft.id ? <Save size={15} /> : <Plus size={15} />}
                {draft.id ? "Guardar cambios" : "Agregar partida"}
              </Button>
            </div>

            {submitted && result && !preview && (
              <p className="field-error small" role="status">
                Revisa las medidas y el precio. El total debe ser un número válido.
              </p>
            )}
          </form>
          {takeoffs.length === 0 ? (
            <div className="empty-table">
              <p>Aún no hay partidas en este proyecto.</p>
              <span className="muted small">Agrega una partida para empezar el presupuesto.</span>
            </div>
          ) : (
            <TakeoffRows
              takeoffs={takeoffs}
              materials={materials}
              onEdit={(takeoff) => {
                setSubmitted(false);
                onEdit(takeoff);
              }}
              onDelete={onDelete}
            />
          )}
        </>
      )}
    </Card>
  );
}

function NumberInput({
  label,
  value,
  submitted,
  onChange,
}: {
  label: string;
  value: number | null;
  submitted: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <NumberField
      label={label}
      value={value}
      min={0}
      error={submitted && !(value && value > 0) ? "Ingresa un valor mayor que cero." : undefined}
      onValueChange={onChange}
    />
  );
}

function TakeoffRows({
  takeoffs,
  materials,
  onEdit,
  onDelete,
}: Pick<TakeoffTableProps, "takeoffs" | "materials" | "onEdit" | "onDelete">) {
  const rows = takeoffs.map((takeoff) => {
    const material = materials.find((item) => item.code === takeoff.materialCode);
    return {
      takeoff,
      material: material?.name ?? takeoff.materialCode,
      details: [
        [
          "Medidas",
          [takeoff.length, takeoff.width, takeoff.height]
            .filter(
              (value, index) =>
                value > 0 &&
                (!material ||
                  (["m2", "m3"].includes(material.unit) && (index < 2 || material.unit === "m3"))),
            )
            .map((value) => value.toFixed(2))
            .join(" × ") || "—",
        ],
        ["Cant.", takeoff.quantity.toFixed(2)],
        ["Merma", takeoff.wastePct + "%"],
        ["P. unit.", "S/ " + (takeoff.unitPricePen ?? material?.ref_price_pen ?? 0).toFixed(2)],
        ["Total", takeoff.total.toFixed(2) + (material ? " " + material.unit : "")],
      ],
      subtotal: "S/ " + takeoff.subtotalPen.toFixed(2),
    };
  });
  const actions = (takeoff: Takeoff) => (
    <div className="row-actions">
      <button
        type="button"
        onClick={() => onEdit(takeoff)}
        aria-label={"Editar partida " + takeoff.partName}
      >
        <Edit3 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(takeoff)}
        aria-label={"Eliminar partida " + takeoff.partName}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
  return (
    <>
      <div className="takeoff-table-wrap">
        <table className="takeoff-table">
          <thead>
            <tr>
              <th scope="col">Partida</th>
              <th scope="col">Material</th>
              {rows[0].details.map(([label]) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
              <th scope="col">Subtotal</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ takeoff, material, details, subtotal }) => (
              <tr key={takeoff.id}>
                <td>{takeoff.partName}</td>
                <td>
                  {material}
                  <small className="mono muted material-code">{takeoff.materialCode}</small>
                </td>
                {details.map(([label, value]) => (
                  <td className="mono" key={label}>
                    {value}
                  </td>
                ))}
                <td className="mono">{subtotal}</td>
                <td>{actions(takeoff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="takeoff-mobile-list">
        {rows.map(({ takeoff, material, details, subtotal }) => (
          <li key={takeoff.id}>
            <div className="section-heading">
              <strong>{takeoff.partName}</strong>
              {actions(takeoff)}
            </div>
            <p className="mono">{subtotal}</p>
            <details>
              <summary>Ver detalle</summary>
              <dl className="project-details">
                <div>
                  <dt>Material</dt>
                  <dd>
                    {material}
                    <small className="mono muted material-code">{takeoff.materialCode}</small>
                  </dd>
                </div>
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label === "Cant." ? "Cantidad base" : label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
