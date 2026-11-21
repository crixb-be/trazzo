"use client";

import { Download, FileText, RefreshCw } from "lucide-react";
import type { jsPDF } from "jspdf";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, confirmDialog, EmptyState, PaywallModal, toast } from "@/components/ui";
import { MATERIALS } from "@/data/seed-rne";
import { chapterFor, computeProjectTotals, shoppingList } from "@/lib/calculators/takeoff";
import { LoadingState } from "@/components/ui/LoadingState";
import { db, type Project, type Takeoff } from "@/lib/offline/db";
import { useMaterials, useProjects, useTakeoffs, useSyncStatus } from "@/lib/offline/hooks";
import { ProjectHub } from "./ProjectHub";
import {
  deleteProject,
  deleteTakeoff,
  saveProject,
  saveTakeoff,
  StaleTakeoffError,
} from "@/lib/offline/repositories";
import { describeSyncResult, describeSyncStatus, syncNow as runSync } from "@/lib/offline/sync";
import { canCreateProject, canExportPdf } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import { ProjectOverview } from "./ProjectOverview";
import { QuickRoomGenerator } from "./QuickRoomGenerator";
import { TakeoffExtras } from "./TakeoffExtras";
import { ProjectDialog, ProjectList, type ProjectForm } from "./ProjectList";
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

const projectTabs = [
  ["resumen", "Resumen y etapas"],
  ["metrados", "Metrados y presupuesto"],
  ["vinculos", "Cálculos y bitácora"],
] as const;

export function MetradosWorkspace() {
  const loadedProjects = useProjects();
  const projects = loadedProjects ?? [];
  const materials = useMaterials();
  const searchParams = useSearchParams();
  const sync = useSyncStatus();
  const selectedId = searchParams.get("project");
  const tab = projectTabs.find(([id]) => id === searchParams.get("tab"))?.[0] ?? "resumen";
  const [editor, setEditor] = useState<{ projectId: string; draft: TakeoffDraft }>();
  const [projectDialog, setProjectDialog] = useState<{ project: Project | null }>();
  const [paywall, setPaywall] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { plan } = useCurrentPlan();

  const activeProject =
    projects.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const activeId = activeProject?.id ?? "";
  const projectTakeoffs = useTakeoffs(activeId);
  const takeoffs = useMemo(
    () => projectTakeoffs.filter((row) => row.projectId === activeId),
    [projectTakeoffs, activeId],
  );
  const catalog = materials.length ? materials : MATERIALS;
  const draft = editor?.projectId === activeId ? editor.draft : emptyDraft;
  const setDraft = (draft: TakeoffDraft) => setEditor({ projectId: activeId, draft });

  function projectHref(projectId: string | null, panel = tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (projectId) params.set("project", projectId);
    else params.delete("project");
    params.set("tab", panel);
    return "/metrados?" + params.toString();
  }

  function selectProject(id: string | null) {
    setEditor(undefined);
    window.history.replaceState(null, "", projectHref(id));
  }

  useEffect(() => {
    setEditor((current) => (current && current.projectId !== activeId ? undefined : current));
  }, [activeId]);

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

  function openNewProject() {
    if (!canCreateProject(plan, projects.length)) setPaywall(true);
    else setProjectDialog({ project: null });
  }

  async function saveProjectDetails(input: ProjectForm) {
    const editing = projectDialog?.project;
    const project = await saveProject(editing ? { ...input, id: editing.id } : input);
    if (!editing) selectProject(project.id);
  }

  async function duplicateProject() {
    if (!canCreateProject(plan, projects.length)) {
      setPaywall(true);
      return;
    }
    const localDb = db;
    if (!activeProject || !localDb || duplicating) return;
    setDuplicating(true);
    try {
      const { name, location, typology, status, client, builtArea } = activeProject;
      const copy = await localDb.transaction(
        "rw",
        [localDb.projects, localDb.takeoffs, localDb.outbox],
        async () => {
          const project = await saveProject({
            name: name + " (copia)",
            location,
            typology,
            status,
            client,
            builtArea,
          });
          const lines = await localDb.takeoffs
            .where("projectId")
            .equals(activeProject.id)
            .toArray();
          for (const line of lines)
            await saveTakeoff({ ...line, id: undefined, projectId: project.id });
          return project;
        },
      );
      selectProject(copy.id);
      toast("Proyecto duplicado.", "ok");
    } catch {
      toast("No se pudo duplicar el proyecto.", "error");
    } finally {
      setDuplicating(false);
    }
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
    if (project.id === activeId) selectProject(null);
  }

  async function saveDraft(line: Omit<Parameters<typeof saveTakeoff>[0], "projectId">) {
    if (!activeProject || (line.id && editor?.projectId !== activeId)) return false;
    try {
      await saveTakeoff({ ...line, projectId: activeId });
      const material = catalog.find((item) => item.code === line.materialCode);
      if (material)
        setEditor((current) =>
          current?.projectId === activeId && current.draft === draft
            ? {
                projectId: activeId,
                draft: {
                  ...emptyDraft,
                  materialCode: material.code,
                  wastePct: material.default_waste_pct,
                  unitPricePen: material.ref_price_pen,
                },
              }
            : current,
        );
      toast(line.id ? "Cambios guardados." : "Partida agregada.", "ok");
      return true;
    } catch (error) {
      if (error instanceof StaleTakeoffError) {
        setEditor((current) =>
          current?.projectId === activeId && current.draft === draft ? undefined : current,
        );
        toast("La partida ya no está disponible en este proyecto.");
      } else {
        toast("No se pudo guardar la partida.", "error");
      }
      return false;
    }
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
    pdf.text("TRAZZO", 14, 18);
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
        pdf.text("TRAZZO GRATIS", 105, 160, { align: "center", angle: 35 });
      }
      pdf.setTextColor(0, 0, 0);
    }
    pdf.save(activeProject.name.replaceAll(" ", "-").toLowerCase() + "-metrados.pdf");
  }

  async function syncNow(): Promise<void> {
    toast(describeSyncResult(await runSync()));
  }

  if (loadedProjects === undefined) return <LoadingState label="Cargando proyectos…" />;

  return (
    <div className="metrados-page">
      <div className="eyebrow">Proyectos</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title" id="projects-heading">
            Proyectos de obra
          </h1>
          <p className="lead">
            Gestiona el expediente de cada obra: ficha, etapas, metrados, presupuesto, cálculos y
            bitácora.
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
          onSelect={selectProject}
          onCreate={openNewProject}
          onEdit={(project) => setProjectDialog({ project })}
          onDelete={(project) => void removeProject(project)}
        />
        <section
          className="takeoff-main"
          aria-labelledby={activeProject ? "active-project-heading" : "projects-heading"}
        >
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
                  <h2 id="active-project-heading">{activeProject.name}</h2>
                  <p className="muted small">
                    {activeProject.location || "Sin ubicación"} ·{" "}
                    {activeProject.client || "Sin cliente"}
                  </p>
                  <div className="header-buttons">
                    <Button
                      size="sm"
                      disabled={duplicating}
                      onClick={() => void duplicateProject()}
                    >
                      Duplicar
                    </Button>
                  </div>
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
              <nav className="segmented project-tabs" aria-label="Secciones del proyecto">
                {projectTabs.map(([id, label]) => (
                  <Link
                    key={id}
                    href={projectHref(activeId, id)}
                    aria-current={tab === id ? "page" : undefined}
                    scroll={false}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              {tab === "resumen" && (
                <ProjectOverview
                  key={activeId}
                  project={activeProject}
                  takeoffs={takeoffs}
                  takeoffsHref={projectHref(activeId, "metrados")}
                  onEdit={() => setProjectDialog({ project: activeProject })}
                />
              )}
              {tab === "metrados" && (
                <>
                  <QuickRoomGenerator key={activeId} projectId={activeId} />
                  <TakeoffExtras key={activeId} projectId={activeId} />
                  <TakeoffTable
                    key={activeId}
                    takeoffs={takeoffs}
                    materials={catalog}
                    draft={draft}
                    setDraft={setDraft}
                    onCancelEdit={() => setEditor(undefined)}
                    onSave={saveDraft}
                    onEdit={editTakeoff}
                    onDelete={(takeoff) => void removeTakeoff(takeoff)}
                  />
                  <Card className="project-budget">
                    <h3>Capítulos y compras</h3>
                    {takeoffs.length === 0 ? (
                      <p className="muted">Agrega partidas para ver capítulos y compras.</p>
                    ) : (
                      <>
                        <h4>Capítulos</h4>
                        {[...new Set(takeoffs.map((row) => chapterFor(row.partName)))].map(
                          (chapter) => (
                            <p key={chapter}>
                              {chapter} · S/{" "}
                              {takeoffs
                                .filter((row) => chapterFor(row.partName) === chapter)
                                .reduce((sum, row) => sum + row.subtotalPen, 0)
                                .toFixed(2)}
                            </p>
                          ),
                        )}
                        <h4>Lista de compras</h4>
                        {shoppingList(takeoffs).map((row) => {
                          const material = catalog.find((item) => item.code === row.code);
                          return (
                            <p key={row.code}>
                              {material?.name ?? row.code} · {row.quantity.toFixed(3)}{" "}
                              {material?.unit} · S/ {row.cost.toFixed(2)}
                              {material && (
                                <small className="mono muted material-code">{row.code}</small>
                              )}
                            </p>
                          );
                        })}
                        <h4>Totales por material</h4>
                        <div className="totals-grid">
                          {Object.entries(totals.byMaterial).map(([code, total]) => {
                            const material = catalog.find((item) => item.code === code);
                            return (
                              <div key={code}>
                                {material?.name ?? code}
                                {material && (
                                  <small className="mono muted material-code">{code}</small>
                                )}
                                <strong>S/ {total.toFixed(2)}</strong>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </Card>
                </>
              )}
              {tab === "vinculos" && <ProjectHub key={activeId} project={activeProject} />}
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
        </section>
      </div>
      {projectDialog && (
        <ProjectDialog
          project={projectDialog.project}
          onClose={() => setProjectDialog(undefined)}
          onSave={saveProjectDetails}
        />
      )}
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
