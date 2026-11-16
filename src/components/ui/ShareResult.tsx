"use client";

import { FileText, ImageDown } from "lucide-react";
import { useRef, useState } from "react";
import { useStudioProfile } from "@/lib/offline/hooks";
import { canExportCleanProposal } from "@/lib/plans/plans";
import { useCurrentPlan } from "@/lib/plans/use-current-plan";
import {
  brandFromStudio,
  sheetFileName,
  sheetText,
  type ResultSheet,
} from "@/lib/share/result-sheet";
import { toast } from "./Feedback";

type Format = "png" | "pdf";

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sends a result or a card as an image or a PDF carrying the studio's brand.
 * Phones open their share menu (WhatsApp, mail…); elsewhere the file downloads.
 * The plate, when there is one, is looked up inside `diagramScope`.
 */
export function ShareResult({
  sheet,
  diagramScope,
}: {
  sheet: ResultSheet;
  /** CSS selector of the ancestor that holds this result's SVG plate. */
  diagramScope?: string;
}) {
  const studio = useStudioProfile();
  const { plan } = useCurrentPlan();
  const [busy, setBusy] = useState<Format | null>(null);
  const root = useRef<HTMLDivElement>(null);

  async function build(format: Format): Promise<File> {
    const brand = brandFromStudio(studio, !canExportCleanProposal(plan));
    const { captureDiagram, renderSheetImage } = await import("@/lib/share/render-image");
    const scope = diagramScope ? root.current?.closest(diagramScope) : null;
    const diagram = await captureDiagram(
      scope?.querySelector<SVGSVGElement>("svg.diagram-svg") ?? null,
    );
    if (format === "png") {
      const blob = await renderSheetImage(sheet, brand, diagram);
      return new File([blob], sheetFileName(sheet, "png"), { type: "image/png" });
    }
    const { buildResultPdf } = await import("@/lib/pdf/export-result");
    const pdf = buildResultPdf(
      sheet,
      brand,
      diagram && {
        dataUrl: diagram.image.toDataURL("image/png"),
        width: diagram.width,
        height: diagram.height,
      },
    );
    return new File([pdf.output("blob")], sheetFileName(sheet, "pdf"), {
      type: "application/pdf",
    });
  }

  async function send(format: Format): Promise<void> {
    setBusy(format);
    try {
      const file = await build(format);
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: sheet.title, text: sheetText(sheet) });
          return;
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          // The share menu refused (for example, the tap expired): fall back to a download.
        }
      }
      download(file);
      toast(
        format === "png"
          ? "Imagen descargada. Envíala desde tu galería o Archivos."
          : "PDF descargado. Envíalo desde Archivos.",
        "ok",
      );
    } catch {
      toast("No se pudo preparar el archivo. Inténtalo otra vez.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="share-result" ref={root} role="group" aria-label="Compartir">
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy !== null}
        onClick={() => void send("png")}
      >
        <ImageDown size={14} aria-hidden="true" />
        {busy === "png" ? "Preparando…" : "Compartir imagen"}
      </button>
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy !== null}
        onClick={() => void send("pdf")}
      >
        <FileText size={14} aria-hidden="true" />
        {busy === "pdf" ? "Preparando…" : "Compartir PDF"}
      </button>
    </div>
  );
}
