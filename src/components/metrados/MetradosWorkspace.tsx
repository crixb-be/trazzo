"use client";

import { Download, FileText, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, PaywallModal } from "@/components/ui";
import { MATERIALS } from "@/data/seed-rne";
import { computeProjectTotals, computeTakeoffLine } from "@/lib/calculators/takeoff";
import { type Project, type Takeoff } from "@/lib/offline/db";
import { useMaterials, useProjects, useTakeoffs, useSyncStatus } from "@/lib/offline/hooks";
import { deleteProject, deleteTakeoff, saveProject, saveTakeoff } from "@/lib/offline/repositories";
import { flushOutbox, pullRemote } from "@/lib/offline/sync";
import { createClient } from "@/lib/supabase/client";
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
  const [pdfEnabled, setPdfEnabled] = useState(false);

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

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", userData.user.id)
        .maybeSingle();

      setPdfEnabled(profile?.plan === "pro" || profile?.plan === "student");
    })();
  }, []);

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
          unitPrice: material?.ref_price_pen ?? 0,
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
    if (projects.length >= 1) {
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
    if (!window.confirm("¿Eliminar " + project.name + " y todas sus partidas?")) return;

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
      unitPrice: material.ref_price_pen,
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
    });

    setDraft({ ...emptyDraft, materialCode: material.code, wastePct: material.default_waste_pct });
    setNotice(null);
  }

  function editTakeoff(takeoff: Takeoff): void {
    setDraft({
      id: takeoff.id,
      partName: takeoff.partName,
      materialCode: takeoff.materialCode,
      length: takeoff.length,
      width: takeoff.width,
      height: takeoff.height,
      quantity: takeoff.quantity,
      wastePct: takeoff.wastePct,
    });
  }

  async function removeTakeoff(takeoff: Takeoff): Promise<void> {
    if (!window.confirm("¿Eliminar la partida " + takeoff.partName + "?")) return;

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

    if (!pdfEnabled) {
      setPaywall(true);
      return;
    }

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
      head: [["Partida", "Material", "Und.", "Cantidad", "Desperd.", "Total", "Subtotal S/"]],
      body: takeoffs.map((takeoff) => {
        const material = catalog.find((item) => item.code === takeoff.materialCode);

        return [
          takeoff.partName,
          material?.name ?? takeoff.materialCode,
          material?.unit ?? "",
          takeoff.quantity.toFixed(2),
          takeoff.wastePct.toFixed(1) + "%",
          takeoff.total.toFixed(2),
          takeoff.subtotalPen.toFixed(2),
        ];
      }),
      foot: [["", "", "", "", "", "TOTAL", "S/ " + totals.grandTotal.toFixed(2)]],
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
    pdf.save(activeProject.name.replaceAll(" ", "-").toLowerCase() + "-metrados.pdf");
  }

  async function syncNow(): Promise<void> {
    try {
      await flushOutbox();
      await pullRemote();
      setNotice("Sincronización completada.");
    } catch {
      setNotice("No se pudo sincronizar. Tus cambios locales permanecen guardados.");
    }
  }

  return (
    <div className="metrados-page">
      <div className="eyebrow">PROYECTOS / METRADOS</div>
      <div className="page-heading-row">
        <div>
          <h1 className="page-title">Metrados</h1>
          <p className="lead">
            Partidas, rendimientos y precios referenciales en soles. Guarda primero en este
            dispositivo.
          </p>
        </div>
        <span className="mono small muted">{sync.pending} pendientes</span>
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
                      <FileText size={14} /> PDF Pro
                    </Button>
                  </div>
                </div>
              </div>
              <TakeoffTable
                takeoffs={takeoffs}
                materials={catalog}
                draft={draft}
                setDraft={setDraft}
                onSave={() => void saveDraft()}
                onEdit={editTakeoff}
                onDelete={(takeoff) => void removeTakeoff(takeoff)}
              />
              {Object.keys(totals.byMaterial).length > 0 && (
                <Card className="material-totals">
                  <div className="eyebrow">TOTALES POR MATERIAL</div>
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
                <button type="button" onClick={() => void syncNow()}>
                  Sincronizar ahora
                </button>
              </div>
              {notice && <p className="warning">{notice}</p>}
            </>
          )}
        </main>
      </div>
      {paywall && (
        <PaywallModal onClose={() => setPaywall(false)} title="Función de plan superior">
          <p>
            El plan Gratis permite un proyecto. Exportar PDF y proyectos adicionales están
            disponibles en Estudiante y Pro.
          </p>
        </PaywallModal>
      )}
    </div>
  );
}
