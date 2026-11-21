import { z } from "zod";
import { SITE_LOG_DRAFT_PREFIX, workspaceStorageKey } from "@/lib/offline/workspace-storage";
import { siteLogSchema } from "./site-log";

const draftState = z.object({
  version: z.string().optional(),
  draft: siteLogSchema
    .omit({ id: true, createdAt: true, updatedAt: true, syncState: true })
    .extend({ visitDate: z.string() }),
});
export type SiteLogEdit = z.infer<typeof draftState>;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function siteLogDraftKey(logId: string | undefined, projectId: string | null): string {
  return workspaceStorageKey(SITE_LOG_DRAFT_PREFIX + (logId ?? "new:" + (projectId ?? "none")));
}

export function readSiteLogDraft(key: string, storage?: DraftStorage): SiteLogEdit | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(key);
    if (!raw) return null;
    const parsed = draftState.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function storeSiteLogDraft(key: string, edit: SiteLogEdit, storage?: DraftStorage): void {
  try {
    (storage ?? window.localStorage).setItem(key, JSON.stringify(edit));
  } catch {
    // A blocked or full store leaves the editor usable.
  }
}

export function clearSiteLogDraft(key: string, storage?: DraftStorage): void {
  try {
    (storage ?? window.localStorage).removeItem(key);
  } catch {
    // Storage can be unavailable in private contexts.
  }
}
