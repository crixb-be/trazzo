"use client";

import { Download, FileText, RefreshCw } from "lucide-react";
import type { jsPDF } from "jspdf";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, confirmDialog, EmptyState, PaywallModal, toast } from "@/components/ui";
import { ProjectsSwitch } from "@/components/layout/ProjectsSwitch";
import { MATERIALS } from "@/data/seed-rne";
import { computeProjectTotals, computeTakeoffLine } from "@/lib/calculators/takeoff";
import { type Project, type Takeoff } from "@/lib/offline/db";
import { useMaterials, useProjects, useTakeoffs, useSyncStatus } from "@/lib/offline/hooks";
import { ProjectHub } from "./ProjectHub";
import { deleteProject, deleteTakeoff, saveProject, saveTakeoff } from "@/lib/offline/repositories";
import { describeSyncResult, describeSyncStatus, syncNow as runSync } from "@/lib/offline/sync";
import { canCreateProject, canExportPdf } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { TakeoffExtras } from "./TakeoffExtras";
import { ProjectList } from "./ProjectList";
import { TakeoffTable, type TakeoffDraft } from "./TakeoffTable";

const emptyDraft: TakeoffDraft = {
  partName: "",
  materialCode: MATERIALS[0]?.code ?? "",
  length: 1,
  width: 1,
  height: 1,
  quantity: 1,
  wastePct: MATERIALS[0]?.default_waste_pct ?? 5,
  unitPricePen: MATERIALS[0]?.ref_price_pen ?? 0,
};

export function MetradosWorkspace() {
  const projects = useProjects();
  const materials = useMaterials();
  const searchParams = useSearchParams();
  const sync = useSyncStatus();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("project"));
  const [draft, setDraft] = useState<TakeoffDraft>({ ...emptyDraft });
  const [paywall, setPaywall] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { plan } = useCurrentPlan();

  const activeProject =
    projects.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const takeoffs = useTakeoffs(activeProject?.id ?? "");
  const catalog = materials.length ? materials : MATERIALS;

  useEffect(() => {
    if (activeProject && activeProject.id !== selectedId) {
      setSelectedId(activeProject.id);
    }
  }, [activeProject, selectedId]);

  useEffect(() => {
    if (selectedId) {
      window.history.replaceState(null, "", "/metrados?project=" + selectedId);
    }
  }, [selectedId]);

  const totalLines = useMemo(
    () =>
      takeoffs.map((takeoff) => {
        const material = catalog.find((item) => item.code === takeoff.materialCode);

        return {
          materialCode: takeoff.materialCode,
          unit: material?.unit ?? "und",
          quantity: takeoff.quantity,
          total: takeoff.total,
          subtotalPen: takeoff.subtotalPen,
          unitPrice: takeoff.unitPricePen ?? material?.ref_price_pen ?? 0,
        };
      }),
    [catalog, takeoffs],
  );
  const totals = computeProjectTotals(totalLines);

  async function createProject(input: {
    name: string;
    location: string;
    typology: string;
    status: Project["status"];
  }): Promise<void> {
    if (!canCreateProject(plan, projects.length)) {
      setPaywall(true);
      return;
    }

    const project = await saveProject(input);
    setSelectedId(project.id);
  }

  async function updateProject(project: Project): Promise<void> {
    await saveProject({
      id: project.id,
      name: project.name,
      location: project.location,
      typology: project.typology,
      status: project.status,
    });
  }

  async function removeProject(project: Project): Promise<void> {
    const confirmed = await confirmDialog({
      title: "¿Eliminar " + project.name + "?",
      message: "Se borrarán el proyecto y todas sus partidas. No se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    await deleteProject(project.id);
    setSelectedId(null);
  }

  async function saveDraft(): Promise<void> {
    if (!activeProject || !draft.partName.trim()) {
      setNotice("Completa el nombre de la partida y selecciona un proyecto.");
      return;
    }

    const material = catalog.find((item) => item.code === draft.materialCode);
    if (!material) {
      setNotice("Selecciona un material del catálogo.");
      return;
    }

    const line = computeTakeoffLine({
      materialCode: material.code,
      unit: material.unit,
      length: draft.length,
      width: draft.width,
      height: draft.height,
      quantity: draft.quantity,
      yieldFactor: material.yield_factor,
      wastePct: draft.wastePct,
      unitPrice: draft.unitPricePen,
    }).values;

    await saveTakeoff({
      id: draft.id,
      projectId: activeProject.id,
      partName: draft.partName.trim(),
      materialCode: material.code,
      length: draft.length,
      width: draft.width,
      height: draft.height,
      quantity: line.quantity,
      wastePct: draft.wastePct,
      total: line.total,
      subtotalPen: line.subtotalPen,
      unitPricePen: draft.unitPricePen,
    });

    setDraft({
      ...emptyDraft,
      materialCode: material.code,
      wastePct: material.default_waste_pct,
      unitPricePen: material.ref_price_pen,
    });
    setNotice(null);
  }

  function editTakeoff(takeoff: Takeoff): void {
    setDraft({
      id: takeoff.id,
      partName: takeoff.partName,
      materialCode: takeoff.materialCode,
      length:
        ["m2", "m3"].includes(catalog.find((m) => m.code === takeoff.materialCode)?.unit ?? "") &&
        takeoff.length === 0
          ? takeoff.quantity
          : takeoff.length,
      width: takeoff.width || 1,
      height: takeoff.height || 1,
      quantity: takeoff.quantity,
      wastePct: takeoff.wastePct,
      unitPricePen:
        takeoff.unitPricePen ??
        catalog.find((item) => item.code === takeoff.materialCode)?.ref_price_pen ??
        0,
    });
  }

  async function removeTakeoff(takeoff: Takeoff): Promise<void> {
    const confirmed = await confirmDialog({
      title: "¿Eliminar la partida " + takeoff.partName + "?",
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    await deleteTakeoff(takeoff.id);
  }

  async function exportCsv(): Promise<void> {
    if (!activeProject) return;

    const header = [
      "Partida",
      "Material",
      "Unidad",
      "Largo",
      "Ancho",
      "Alto",
      "Cantidad",
      "Desperdicio",
      "Precio unitario",
      "Total",
      "Subtotal PEN",
    ];
    const rows = takeoffs.map((takeoff) => {
      const material = catalog.find((item) => item.code === takeoff.materialCode);

      return [
        takeoff.partName,
        material?.name ?? takeoff.materialCode,
        material?.unit ?? "",
        takeoff.length.toFixed(2),
        takeoff.width.toFixed(2),
        takeoff.height.toFixed(2),
        takeoff.quantity.toFixed(2),
        takeoff.wastePct + "%",
        (takeoff.unitPricePen ?? material?.ref_price_pen ?? 0).toFixed(2),
        takeoff.total.toFixed(2),
        takeoff.subtotalPen.toFixed(2),
      ];
    });
    const escape = (value: string): string => '"' + value.replaceAll('"', '""') + '"';
    const content =
      "\uFEFF" + [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    link.download = activeProject.name.replaceAll(" ", "-").toLowerCase() + "-metrados.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportPdf(): Promise<void> {
    if (!activeProject) return;

    const watermark = !canExportPdf(plan);
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("TRAZO", 14, 18);
    pdf.setFontSize(11);
    pdf.text("Metrado referencial", 14, 26);
    pdf.setFontSize(9);
    pdf.text(activeProject.name, 14, 34);
    pdf.text(activeProject.location || "Sin ubicación", 14, 40);

    autoTable(pdf, {
      startY: 48,
      head: [
        ["Partida", "Material", "Und.", "Cantidad", "Desperd.", "P. unit.", "Total", "Subtotal S/"],
      ],
      body: takeoffs.map((takeoff) => {
        const material = catalog.find((item) => item.code === takeoff.materialCode);

        return [
          takeoff.partName,
          material?.name ?? takeoff.materialCode,
          material?.unit ?? "",
          takeoff.quantity.toFixed(2),
          takeoff.wastePct.toFixed(1) + "%",
          "S/ " + (takeoff.unitPricePen ?? material?.ref_price_pen ?? 0).toFixed(2),
          takeoff.total.toFixed(2),
          takeoff.subtotalPen.toFixed(2),
        ];
      }),
      foot: [["", "", "", "", "", "", "TOTAL", "S/ " + totals.grandTotal.toFixed(2)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 163, 89] },
    });

    const finalY =
      (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
    pdf.setFontSize(8);
    pdf.text(
      "Precios referenciales Lima 2026. Verifica rendimientos y precios en obra.",
      14,
      finalY + 14,
    );
    if (watermark) {
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(46);
        pdf.text("TRAZO GRATIS", 105, 160, { align: "center", angle: 35 });
      }
      pdf.setTextColor(0, 0, 0);
    }
    pdf.save(activeProject.name.replaceAll(" ", "-").toLowerCase() + "-metrados.pdf");
  }

  async function syncNow(): Promise<void> {
    toast(describeSyncResult(await runSync()));
  }

  return (
    <div className="metrados-page">
      <ProjectsSwitch />
      <div className="eyebrow">Proyectos / Metrados</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Metrados</h1>
          <p className="lead">
            Partidas, rendimientos y precios referenciales en soles. Guarda primero en este
            dispositivo.
          </p>
        </div>
        <div className="inline-actions">
          <span className="small muted" role="status">
            {describeSyncStatus(sync)}
          </span>
          <Button size="sm" disabled={!sync.online || sync.syncing} onClick={() => void syncNow()}>
            <RefreshCw size={14} aria-hidden="true" /> Sincronizar ahora
          </Button>
        </div>
      </div>
      <div className="metrados-layout">
        <ProjectList
          projects={projects}
          selectedId={activeProject?.id ?? null}
          onSelect={setSelectedId}
          onCreate={(input) => void createProject(input)}
          onEdit={(project) => void updateProject(project)}
          onDelete={(project) => void removeProject(project)}
        />
        <main className="takeoff-main">
          {!activeProject ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="Selecciona o crea un proyecto"
              description="El plan Gratis incluye un proyecto local."
            />
          ) : (
            <>
              <div className="project-header-card">
                <div>
                  <div className="eyebrow">
                    {activeProject.typology || "PROYECTO"} · {activeProject.status}
                  </div>
                  <h2>{activeProject.name}</h2>
                  <p className="muted small">
                    {activeProject.location || "Sin ubicación"} · {takeoffs.length} partidas
                  </p>
                </div>
                <div className="project-total">
                  <span className="muted small">TOTAL REFERENCIAL</span>
                  <strong className="mono">S/ {totals.grandTotal.toFixed(2)}</strong>
                  <div className="header-buttons">
                    <Button size="sm" onClick={() => void exportCsv()}>
                      <Download size={14} /> CSV
                    </Button>
                    <Button size="sm" onClick={() => void exportPdf()}>
                      <FileText size={14} /> PDF
                    </Button>
                  </div>
                </div>
              </div>
              <TakeoffExtras
                key={activeProject.id}
                project={activeProject}
                lines={takeoffs}
                canDuplicate={canCreateProject(plan, projects.length)}
                onDuplicate={(p) => setSelectedId(p.id)}
              />
              <TakeoffTable
                takeoffs={takeoffs}
                materials={catalog}
                draft={draft}
                setDraft={setDraft}
                onCancelEdit={() => setDraft({ ...emptyDraft })}
                onSave={() => void saveDraft()}
                onEdit={editTakeoff}
                onDelete={(takeoff) => void removeTakeoff(takeoff)}
              />
              <ProjectHub key={"hub-" + activeProject.id} project={activeProject} />
              {Object.keys(totals.byMaterial).length > 0 && (
                <Card className="material-totals">
                  <div className="eyebrow">Totales por material</div>
                  <div className="totals-grid">
                    {Object.entries(totals.byMaterial).map(([code, total]) => (
                      <div key={code}>
                        <span className="mono small">{code}</span>
                        <strong>S/ {total.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <div className="sync-strip">
                <RefreshCw size={14} />
                <span>
                  {sync.lastSync
                    ? "Última sync " + new Date(sync.lastSync).toLocaleString("es-PE")
                    : "Solo local"}
                </span>
              </div>
            </>
          )}
          {notice && <p className="warning">{notice}</p>}
        </main>
      </div>
      {paywall && (
        <PaywallModal onClose={() => setPaywall(false)} title="Función de plan superior">
          <p>
            El plan Gratis incluye un proyecto y PDF con marca de agua. Estudiante y Pro tienen
            proyectos ilimitados y PDF limpio.
          </p>
        </PaywallModal>
      )}
    </div>
  );
}
