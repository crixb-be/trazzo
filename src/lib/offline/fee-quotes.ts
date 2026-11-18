import {
  calculateFeeQuote,
  formatQuoteCode,
  type FeeQuoteInput,
  type Milestone,
  type PaymentInstallment,
  type PaymentPreset,
} from "@/lib/calculators/fees";
import { createLocalUuid, db, nextUpdatedAt, type FeeQuote } from "./db";
import { scheduleSync } from "./sync";

export interface FeeQuoteDraft {
  documentType: "propuesta" | "cotizacion";
  projectName: string;
  clientName: string;
  clientDocument: string;
  location: string;
  signerName: string;
  signerDocument: string;
  input: FeeQuoteInput;
  deliverables: string[];
  schedule: Milestone[];
  payment: { presetId: PaymentPreset["id"]; installments: PaymentInstallment[] };
  conditions: string[];
}

export async function nextQuoteCode(date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const prefix = "COT-" + year + "-";
  const quotes = db ? await db.fee_quotes.toArray() : [];
  const maxSequence = quotes.reduce((max, quote) => {
    if (!quote.code.startsWith(prefix)) return max;
    const sequence = Number(quote.code.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return formatQuoteCode(year, maxSequence + 1);
}

export async function saveFeeQuote(
  draft: FeeQuoteDraft,
  options: { id?: string; code?: string; createdAt?: string } = {},
): Promise<FeeQuote> {
  if (!db) throw new Error("La base local no está disponible.");
  const localDb = db;
  const result = calculateFeeQuote(draft.input);
  const quote = await localDb.transaction("rw", [localDb.fee_quotes, localDb.outbox], async () => {
    const existing = options.id ? await localDb.fee_quotes.get(options.id) : undefined;
    const now = nextUpdatedAt(existing?.updatedAt);
    const row: FeeQuote = {
      ...draft,
      id: options.id ?? createLocalUuid(),
      code: options.code ?? existing?.code ?? (await nextQuoteCode()),
      createdAt: options.createdAt ?? existing?.createdAt ?? now,
      updatedAt: now,
      totals: { subtotal: result.subtotal, taxAmount: result.taxAmount, total: result.total },
      syncState: "pending",
    };
    await localDb.fee_quotes.put(row);
    await localDb.outbox.add({ table: "fee_quotes", op: "upsert", payload: row, createdAt: now });
    return row;
  });
  scheduleSync();
  return quote;
}

export async function duplicateFeeQuote(id: string): Promise<FeeQuote> {
  if (!db) throw new Error("La base local no está disponible.");
  const localDb = db;
  const original = await localDb.fee_quotes.get(id);
  if (!original) throw new Error("No se encontró la cotización.");
  return saveFeeQuote(
    {
      ...original,
      documentType: original.documentType ?? "propuesta",
      clientDocument: original.clientDocument ?? "",
      signerName: original.signerName ?? "",
      signerDocument: original.signerDocument ?? "",
      projectName: original.projectName + " (copia)",
    },
    { createdAt: new Date().toISOString() },
  );
}

export async function deleteFeeQuote(id: string): Promise<void> {
  if (!db) throw new Error("La base local no está disponible.");
  const localDb = db;
  await localDb.transaction("rw", [localDb.fee_quotes, localDb.outbox], async () => {
    const quote = await localDb.fee_quotes.get(id);
    if (!quote) return;
    await localDb.fee_quotes.delete(id);
    await localDb.outbox.add({
      table: "fee_quotes",
      op: "delete",
      payload: { id },
      createdAt: nextUpdatedAt(quote.updatedAt),
    });
  });
  scheduleSync();
}
