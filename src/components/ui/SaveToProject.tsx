"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useProjects } from "@/lib/offline/hooks";
import { saveProjectNote } from "@/lib/offline/project-hub";
import type { ResultSheet } from "@/lib/share/result-sheet";
import { toast } from "./Feedback";

/** Files the current calculator result under one of the user's projects. */
export function SaveToProject({ sheet }: { sheet: ResultSheet }) {
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const chosen = projects.find((project) => project.id === projectId) ?? projects[0];

  async function save(): Promise<void> {
    if (!chosen) return;
    try {
      await saveProjectNote(chosen.id, sheet);
      setOpen(false);
      toast("Cálculo guardado en " + chosen.name + ".", "ok", {
        label: "Ver proyecto",
        run: () => window.location.assign("/metrados?project=" + chosen.id),
      });
    } catch {
      toast("No se pudo guardar el cálculo.", "error");
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        <FolderPlus size={14} aria-hidden="true" /> Guardar en proyecto
      </button>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="save-to-project muted small" role="status">
        Aún no tienes proyectos. <Link href="/metrados">Crea uno en Proyectos</Link> y vuelve a
        guardar.
      </p>
    );
  }

  return (
    <div className="save-to-project">
      <label>
        <span>Proyecto</span>
        <select
          className="select"
          value={chosen?.id ?? ""}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => void save()}>
        Guardar
      </button>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </div>
  );
}
