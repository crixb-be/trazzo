"use client";

import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, confirmDialog, toast } from "@/components/ui";
import {
  backupFileName,
  describeBackup,
  exportBackup,
  importBackup,
  parseBackup,
} from "@/lib/offline/backup";
import type { Plan } from "@/lib/plans/plans";

/** Saves the user's work to a file and restores it, with or without an account. */
export function BackupCard({ plan }: { plan: Plan }) {
  const input = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [busy, setBusy] = useState(false);

  async function download(): Promise<void> {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backupFileName();
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Copia descargada: " + describeBackup(backup) + ".", "ok");
    } catch {
      toast("No se pudo crear la copia.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File): Promise<void> {
    setBusy(true);
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        toast(parsed.error, "error");
        return;
      }
      const confirmed = await confirmDialog({
        title: "¿Restaurar esta copia?",
        message:
          "Contiene " +
          describeBackup(parsed.backup) +
          ". Lo que coincida con lo guardado aquí se reemplaza; lo demás no se borra.",
        confirmLabel: "Restaurar",
      });
      if (!confirmed) return;
      const result = await importBackup(parsed.backup, plan);
      if (result.ok) toast("Copia restaurada.", "ok");
      else toast(result.error, "error");
    } catch {
      toast("No se pudo leer el archivo.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Card>
      <div className="eyebrow">COPIA DE SEGURIDAD</div>
      <h2>Tu trabajo en un archivo</h2>
      <p className="muted small">
        Proyectos, metrados, cálculos guardados, cotizaciones, perfil del estudio, favoritos y
        matriz. Guárdala en tu nube o envíatela por correo; sirve para pasar a otro teléfono sin
        cuenta.
      </p>
      <div className="hero-actions">
        <Button onClick={() => void download()} disabled={!ready || busy}>
          <Download size={15} /> Descargar copia
        </Button>
        <Button
          variant="secondary"
          onClick={() => input.current?.click()}
          disabled={!ready || busy}
        >
          <Upload size={15} /> Restaurar copia
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        disabled={!ready || busy}
        accept="application/json,.json"
        hidden
        aria-label="Archivo de copia de seguridad"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void restore(file);
        }}
      />
    </Card>
  );
}
