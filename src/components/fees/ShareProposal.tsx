"use client";
import { useEffect, useState } from "react";
import type { FeeQuote, StudioProfile } from "@/lib/offline/db";
import type { FeeQuoteResult } from "@/lib/calculators/fees";
export function ShareProposal({
  quote,
  result,
  studio,
  watermark,
}: {
  quote: FeeQuote;
  result: FeeQuoteResult;
  studio: StudioProfile;
  watermark: boolean;
}) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const signature = JSON.stringify([quote, result, studio, watermark]);
  const [preparedFor, setPreparedFor] = useState("");
  useEffect(() => {
    setFile(null);
  }, [signature]);
  async function prepare() {
    setBusy(true);
    try {
      const { buildProposalPdf } = await import("@/lib/pdf/export-proposal");
      const pdf = buildProposalPdf(quote, result, { studio, watermark });
      setFile(new File([pdf.output("blob")], quote.code + ".pdf", { type: "application/pdf" }));
      setPreparedFor(signature);
      setNotice("PDF listo. Pulsa Compartir PDF para elegir la aplicación.");
    } catch {
      setNotice("No se pudo preparar el PDF.");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!file || preparedFor !== signature) return;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Propuesta TRAZZO" });
        setNotice("PDF compartido.");
      } else {
        const url = URL.createObjectURL(file),
          link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("PDF descargado. Puedes enviarlo desde Archivos.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNotice("No se pudo compartir. Puedes usar la descarga PDF.");
    }
  }
  return (
    <div className="card">
      <h3>Compartir propuesta</h3>
      <button className="btn" disabled={busy} onClick={() => void prepare()}>
        {busy ? "Preparando…" : "Preparar PDF para compartir"}
      </button>
      {file && preparedFor === signature && (
        <button className="btn btn-primary" onClick={() => void share()}>
          Compartir PDF
        </button>
      )}
      <p role="status">{notice}</p>
    </div>
  );
}
