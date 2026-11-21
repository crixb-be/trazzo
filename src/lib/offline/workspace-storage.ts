import { GUEST_WORKSPACE, getActiveWorkspaceId } from "./workspace";

export const EXPEDIENTE_CHECKLIST_KEY = "trazzo-expediente-checklist";
export const SITE_LOG_DRAFT_PREFIX = "trazzo:site-log-draft:";

export function workspaceStorageKey(base: string, id = getActiveWorkspaceId()): string {
  return id === GUEST_WORKSPACE ? base : base + ":" + id;
}

export function workspaceStorageEntries(id: string) {
  if (typeof window === "undefined") return [];
  const storage = window.localStorage;
  const entries: Array<{ base: string; key: string; value: string }> = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const suffix = ":" + id;
    if (id !== GUEST_WORKSPACE && !key.endsWith(suffix)) continue;
    const base = id === GUEST_WORKSPACE ? key : key.slice(0, -suffix.length);
    if (base !== EXPEDIENTE_CHECKLIST_KEY && !base.startsWith(SITE_LOG_DRAFT_PREFIX)) continue;
    // A bare draft uses either a visit id or "new:" plus a project id.
    if (
      base !== EXPEDIENTE_CHECKLIST_KEY &&
      !/^(?:new:)?[^:]+$/.test(base.slice(SITE_LOG_DRAFT_PREFIX.length))
    )
      continue;
    const value = storage.getItem(key);
    if (value !== null) entries.push({ base, key, value });
  }
  return entries;
}

export function clearWorkspaceStorage(id: string): void {
  for (const { key } of workspaceStorageEntries(id)) window.localStorage.removeItem(key);
}
