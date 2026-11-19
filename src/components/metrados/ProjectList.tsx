"use client";

import { useState } from "react";
import { Check, Edit3, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import type { Project, ProjectStatus } from "@/lib/offline/db";

export interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (input: {
    name: string;
    location: string;
    typology: string;
    status: ProjectStatus;
  }) => void;
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Lima, Perú");
  const [typology, setTypology] = useState("vivienda");
  const [status, setStatus] = useState<ProjectStatus>("activo");

  function openCreate(): void {
    setEditing(null);
    setName("");
    setLocation("Lima, Perú");
    setTypology("vivienda");
    setStatus("activo");
    setOpen(true);
  }

  function openEdit(project: Project): void {
    setEditing(project);
    setName(project.name);
    setLocation(project.location);
    setTypology(project.typology);
    setStatus(project.status);
    setOpen(true);
  }

  function closeDialog(): void {
    setOpen(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!name.trim()) return;

    if (editing) {
      onEdit({
        ...editing,
        name: name.trim(),
        location,
        typology,
        status,
      });
    } else {
      onCreate({ name: name.trim(), location, typology, status });
    }

    closeDialog();
  }

  return (
    <aside className="project-sidebar">
      <div className="project-sidebar-header">
        <div>
          <div className="eyebrow">Espacios locales</div>
          <h2>Proyectos</h2>
        </div>
        <Button size="sm" variant="secondary" type="button" onClick={openCreate}>
          <Plus size={14} aria-hidden="true" /> Nuevo proyecto
        </Button>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} />}
          title="Sin proyectos"
          description="Crea uno para empezar a ordenar partidas."
          action={
            <Button size="sm" onClick={openCreate}>
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
                  onClick={() => openEdit(project)}
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
      {open && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal project-dialog" onSubmit={submit}>
            <div className="eyebrow">{editing ? "EDITAR PROYECTO" : "NUEVO PROYECTO"}</div>
            <h2>{editing ? "Actualiza la obra" : "Organiza una obra"}</h2>
            <div className="field">
              <label htmlFor="project-name">Nombre</label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Casa Miraflores"
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
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                <Check size={15} /> {editing ? "Guardar cambios" : "Crear proyecto"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
