"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/components/ui";
import type { Project } from "@/lib/offline/db";
import {
  addProjectPhoto,
  deleteProjectPhoto,
  MAX_PROJECT_PHOTOS,
  updateProjectPhotoCaption,
  useProjectPhotos,
} from "@/lib/offline/project-hub";
import { fileToPhotoDataUrl, isNativeApp, takeNativePhoto } from "@/lib/native/camera";

/** Site photos of a project, taken with the phone's camera and kept on the device. */
export function ProjectPhotos({ project }: { project: Project }) {
  const photos = useProjectPhotos(project.id);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function store(dataUrl: string): Promise<void> {
    const result = await addProjectPhoto(project.id, dataUrl);
    if (!result.ok) toast(result.error, "error");
  }

  async function capture(): Promise<void> {
    if (await isNativeApp()) {
      setBusy(true);
      try {
        const dataUrl = await takeNativePhoto();
        if (dataUrl) await store(dataUrl);
      } finally {
        setBusy(false);
      }
      return;
    }
    // On the web the file input with `capture` opens the phone's camera.
    input.current?.click();
  }

  async function onFile(file: File): Promise<void> {
    setBusy(true);
    try {
      await store(await fileToPhotoDataUrl(file));
    } catch {
      toast("No se pudo leer la foto.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <div className="project-photos-heading">
        <h3>Fotos de obra</h3>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void capture()}>
          <Camera size={14} aria-hidden="true" /> {busy ? "Guardando…" : "Tomar foto"}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Foto de obra"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {photos.length === 0 ? (
        <p className="muted small">
          Registra avances o detalles con la cámara. Hasta {MAX_PROJECT_PHOTOS} fotos por proyecto,
          guardadas en este dispositivo.
        </p>
      ) : (
        <ul className="project-photos">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              {/* A stored data URL: next/image cannot optimise it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={photo.caption || "Foto de obra " + (photos.length - index)}
                loading="lazy"
              />
              <input
                className="input"
                defaultValue={photo.caption}
                placeholder="Nota (opcional)"
                aria-label={"Nota de la foto " + (photos.length - index)}
                onBlur={(event) => void updateProjectPhotoCaption(photo.id, event.target.value)}
              />
              <div className="project-photo-meta">
                <small className="mono">{new Date(photo.createdAt).toLocaleString("es-PE")}</small>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={"Quitar foto " + (photos.length - index)}
                  onClick={() => void deleteProjectPhoto(photo.id)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
