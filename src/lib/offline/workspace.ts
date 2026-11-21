import { ensureSeeded, TrazzoDB } from "./db";

export const GUEST_WORKSPACE = "guest";
export const WORKSPACE_OWNER = "workspace:owner";
const STORAGE_KEY = "trazzo-workspace";
const listeners = new Set<() => void>();
let active: TrazzoDB | undefined;
let activeId = GUEST_WORKSPACE;
let activated = false;
let activations = Promise.resolve(GUEST_WORKSPACE as string);

export function isAccountWorkspaceId(id: string | undefined | null): id is string {
  return Boolean(id && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id));
}

export function workspaceDbName(id: string): string {
  if (id === GUEST_WORKSPACE) return "TrazzoDB";
  if (!isAccountWorkspaceId(id)) throw new Error("Espacio de trabajo inválido.");
  return "TrazzoDB-u-" + id;
}

export function readLastWorkspaceId(): string {
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    if (isAccountWorkspaceId(id)) return id;
  } catch {
    // Storage may be blocked.
  }
  return GUEST_WORKSPACE;
}

export function getActiveWorkspaceId(): string {
  return activeId;
}

export function getActiveDatabase(): TrazzoDB {
  return (active ??= new TrazzoDB(workspaceDbName(activeId)));
}

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function preloadWorkspace(id: string): Promise<void> {
  const local = new TrazzoDB(workspaceDbName(id));
  try {
    await local.open();
  } finally {
    local.close();
  }
}

export function activateWorkspace(id: string): Promise<string> {
  const activation = activations
    .catch(() => activeId)
    .then(async () => {
      const previous = getActiveDatabase();
      const next = id === activeId ? previous : new TrazzoDB(workspaceDbName(id));
      try {
        await next.open();
        await ensureSeeded(next);
      } catch (error) {
        if (next !== previous) next.close();
        throw error;
      }
      active = next;
      activeId = id;
      if (next !== previous) previous.close();
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // The active instance still works without localStorage.
      }
      if (!activated || next !== previous) {
        activated = true;
        for (const listener of listeners) listener();
      }
      return id;
    });
  activations = activation;
  return activation;
}
