"use client";

import { useState } from "react";
import { Check, Edit3, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Feedback";
import type { Project, ProjectStatus } from "@/lib/offline/db";

export interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const typologies = [
  { value: "vivienda", label: "Vivienda" },
  { value: "multifamiliar", label: "Multifamiliar" },
  { value: "comercio", label: "Comercio" },
  { value: "oficinas", label: "Oficinas" },
  { value: "educación", label: "Educación" },
];

const statuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "Pausado" },
  { value: "cerrado", label: "Cerrado" },
];

export function ProjectList({
  projects,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: ProjectListProps) {
  return (
    <aside className="project-sidebar">
      <div className="project-sidebar-header">
        <div>
          <div className="eyebrow">Espacios locales</div>
          <h2>Proyectos</h2>
        </div>
        <Button size="sm" variant="secondary" type="button" onClick={onCreate}>
          <Plus size={14} aria-hidden="true" /> Nuevo proyecto
        </Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} />}
          title="Sin proyectos"
          description="Crea uno para empezar a ordenar partidas."
          action={
            <Button size="sm" onClick={onCreate}>
              <Plus size={14} /> Crear
            </Button>
          }
        />
      ) : (
        <div className="project-list">
          {projects.map((project) => (
            <div
              className={"project-list-item " + (project.id === selectedId ? "active" : "")}
              key={project.id}
            >
              <button type="button" onClick={() => onSelect(project.id)}>
                <FolderOpen size={16} aria-hidden="true" />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.location || "Sin ubicación"}</small>
                </span>
                {project.syncState === "pending" && (
                  <span className="sync-dot" title="Pendiente de sync" />
                )}
              </button>
              <div className="project-item-actions">
                <button
                  type="button"
                  onClick={() => onEdit(project)}
                  aria-label={"Editar " + project.name}
                >
                  <Edit3 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(project)}
                  aria-label={"Eliminar " + project.name}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export type ProjectForm = Pick<Project, "name" | "location" | "typology" | "status" | "client">;

export function ProjectDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (input: ProjectForm) => Promise<void>;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [client, setClient] = useState(project?.client ?? "");
  const [location, setLocation] = useState(project?.location ?? "Lima, Perú");
  const [typology, setTypology] = useState(project?.typology ?? "vivienda");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "activo");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), client: client.trim(), location, typology, status });
      onClose();
    } catch {
      toast("No se pudo guardar el proyecto en este dispositivo. Inténtalo de nuevo.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      className="project-dialog"
      title={project ? "Editar ficha" : "Nuevo proyecto"}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="project-name">Nombre</label>
          <Input
            id="project-name"
            data-initial-focus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Casa Miraflores"
            aria-required="true"
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? "project-name-error" : undefined}
          />
          {nameError && (
            <span className="field-error small" id="project-name-error">
              Ingresa el nombre del proyecto.
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="project-client">Cliente</label>
          <Input
            id="project-client"
            value={client}
            onChange={(event) => setClient(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="project-location">Ubicación</label>
          <Input
            id="project-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>
        <Select
          label="Tipología"
          value={typology}
          onChange={(event) => setTypology(event.target.value)}
          options={typologies}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as ProjectStatus)}
          options={statuses}
        />
        <div className="dialog-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <Check size={15} /> {project ? "Guardar cambios" : "Crear proyecto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
