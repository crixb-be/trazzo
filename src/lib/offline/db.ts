import Dexie, { type Table } from "dexie";
import { MATERIALS, RNE_CARDS, SEED_VERSION, type Material, type RneCard } from "@/data/seed-rne";
import type {
  FeeQuoteInput,
  Milestone,
  PaymentInstallment,
  PaymentPreset,
} from "@/lib/calculators/fees";

export type SyncState = "local" | "pending" | "synced";
export type ProjectStatus = "activo" | "pausado" | "cerrado";

export interface Project {
  id: string;
  name: string;
  location: string;
  typology: string;
  status: ProjectStatus;
  updatedAt: string;
  syncState: SyncState;
}

export interface Takeoff {
  id: string;
  projectId: string;
  partName: string;
  materialCode: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  wastePct: number;
  total: number;
  subtotalPen: number;
  unitPricePen?: number;
  updatedAt: string;
  syncState: SyncState;
}

export interface Meta {
  key: string;
  value: string;
}

export interface StudioProfile {
  id: "default";
  fullName: string;
  capNumber: string;
  studioName: string;
  ruc: string;
  address: string;
  brandPrimary: string;
  brandSecondary: string;
  logoDataUrl: string | null;
  /** Square JPEG data URL of the user's profile photo. */
  avatarDataUrl: string | null;
  updatedAt: string;
}

export type OutboxTable = "projects" | "takeoffs" | "fee_quotes";
export type OutboxOperation = "upsert" | "delete";

export interface FeeQuote {
  id: string;
  code: string;
  documentType?: "propuesta" | "cotizacion";
  projectName: string;
  clientName: string;
  /** DNI or RUC of the client, shown under their signature. */
  clientDocument?: string;
  location: string;
  /** Signer overrides; empty means "take it from the studio profile". */
  signerName?: string;
  signerDocument?: string;
  input: FeeQuoteInput;
  deliverables: string[];
  schedule: Milestone[];
  payment: { presetId: PaymentPreset["id"]; installments: PaymentInstallment[] };
  conditions: string[];
  totals: { subtotal: number; taxAmount: number; total: number };
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface Outbox {
  id?: number;
  table: OutboxTable;
  op: OutboxOperation;
  payload: unknown;
  createdAt: string;
}

export interface ProjectNoteRow {
  label: string;
  value: string;
  status?: "ok" | "fail";
}

/** A calculator result kept with a project so it can be reviewed later. */
export interface ProjectNote {
  id: string;
  projectId: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: ProjectNoteRow[];
  notes: string[];
  createdAt: string;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  /** JPEG data URL, longest side 1280 px. */
  dataUrl: string;
  caption: string;
  createdAt: string;
}

export interface ProjectLink {
  quoteId: string;
  projectId: string;
}

export class TrazzoDB extends Dexie {
  rneCards!: Table<RneCard, string>;
  materials!: Table<Material, string>;
  projects!: Table<Project, string>;
  takeoffs!: Table<Takeoff, string>;
  meta!: Table<Meta, string>;
  outbox!: Table<Outbox, number>;
  fee_quotes!: Table<FeeQuote, string>;
  studio_profile!: Table<StudioProfile, string>;

  project_options!: Table<{ projectId: string; area: number }, string>;

  library_activity!: Table<{ slug: string; favorite: boolean; visitedAt: string }, string>;
  /** Calculator results saved inside a project. Kept on this device. */
  project_notes!: Table<ProjectNote, string>;
  /** Which project a fee quote belongs to. Kept on this device. */
  project_links!: Table<ProjectLink, string>;
  /** Site photos taken for a project. Kept on this device. */
  project_photos!: Table<ProjectPhoto, string>;
  constructor() {
    super("TrazzoDB");
    this.version(1).stores({
      rneCards: "slug,norm_code,category,*keywords",
      materials: "code,category",
      projects: "id,updatedAt,syncState",
      takeoffs: "id,projectId,updatedAt,syncState",
      meta: "key",
      outbox: "++id,table,createdAt",
    });
    this.version(2).stores({
      rneCards: "slug,norm_code,category,*keywords",
      materials: "code,category",
      projects: "id,updatedAt,syncState",
      takeoffs: "id,projectId,updatedAt,syncState",
      meta: "key",
      outbox: "++id,table,createdAt",
      fee_quotes: "id,code,updatedAt,syncState",
    });
    this.version(7).stores({ project_photos: "id,projectId,createdAt" });
    this.version(6).stores({
      project_notes: "id,projectId,createdAt",
      project_links: "quoteId,projectId",
    });
    this.version(5).stores({ library_activity: "slug,visitedAt" });
    this.version(4).stores({
      project_options: "projectId",
    });
    this.version(3).stores({
      rneCards: "slug,norm_code,category,*keywords",
      materials: "code,category",
      projects: "id,updatedAt,syncState",
      takeoffs: "id,projectId,updatedAt,syncState",
      meta: "key",
      outbox: "++id,table,createdAt",
      fee_quotes: "id,code,updatedAt,syncState",
      studio_profile: "id",
    });
  }
}

export const db: TrazzoDB | null = typeof window === "undefined" ? null : new TrazzoDB();

export function createLocalUuid(): string {
  return crypto.randomUUID();
}

export async function ensureSeeded(): Promise<void> {
  if (!db) return;
  const current = await db.meta.get("seedVersion");
  if (Number(current?.value ?? 0) >= SEED_VERSION) return;

  await db.transaction("rw", [db.rneCards, db.materials, db.meta], async () => {
    await db.rneCards.clear();
    await db.materials.clear();
    await db.rneCards.bulkPut(RNE_CARDS);
    await db.materials.bulkPut(MATERIALS);
    await db.meta.put({ key: "seedVersion", value: String(SEED_VERSION) });
  });
}
