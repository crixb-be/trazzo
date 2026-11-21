import { z } from "zod";
import type { SiteLogTopic, SiteVisitType } from "@/lib/offline/db";

export const MAX_SITE_LOG_PHOTOS = 12;
export const SITE_LOG_PHOTO_LIMIT = `Puedes agregar hasta ${MAX_SITE_LOG_PHOTOS} fotos por visita.`;
export const VISIT_TYPES: Record<SiteVisitType, string> = {
  apertura: "Apertura",
  visita: "Visita de obra",
  cierre: "Cierre",
};
export const SITE_LOG_TOPICS: Record<SiteLogTopic, string> = {
  linderos: "Linderos y trazos",
  suelos: "Suelos y cimentación",
  estructuras: "Estructuras",
  arquitectura: "Arquitectura y acabados",
  instalaciones: "Instalaciones",
  seguridad: "Seguridad en obra",
};
export const SITE_LOG_SECTIONS = {
  workStatus: "Estado de los trabajos",
  findings: "Hallazgos",
  orders: "Órdenes o medidas impartidas",
  followUp: "Seguimiento de visita anterior",
} as const;

export const siteVisitDate = z.string().date();
export const siteLogSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  visitType: z.enum(["apertura", "visita", "cierre"]),
  visitDate: siteVisitDate,
  attendees: z.string(),
  workStatus: z.string(),
  findings: z.string(),
  orders: z.string(),
  followUp: z.string(),
  topics: z.array(
    z.enum(["linderos", "suelos", "estructuras", "arquitectura", "instalaciones", "seguridad"]),
  ),
  photos: z
    .array(
      z.object({
        id: z.string().min(1),
        dataUrl: z.string().startsWith("data:image/"),
        caption: z.string(),
        createdAt: z.string().datetime({ offset: true }),
      }),
    )
    .max(MAX_SITE_LOG_PHOTOS),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  syncState: z.enum(["local", "pending", "synced"]),
});
