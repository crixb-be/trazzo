import Dexie from "dexie";
import { PROFILE_DIRTY } from "./profile-sync";
import {
  activateWorkspace,
  getActiveDatabase,
  getActiveWorkspaceId,
  GUEST_WORKSPACE,
  workspaceDbName,
} from "./workspace";
import { prepareGuestWorkspace } from "./workspace-migration";
import { clearWorkspaceStorage } from "./workspace-storage";

type DeleteOptions = {
  confirm: (pending: number) => Promise<boolean | "alternate">;
  sync: () => Promise<void>;
  signOut: () => Promise<void>;
};

/** The caller supplies the danger confirmation and can offer to sync before deciding. */
export async function deleteLocalCopy(
  userId: string,
  { confirm, sync, signOut }: DeleteOptions,
): Promise<boolean> {
  const name = workspaceDbName(userId);
  const local = getActiveDatabase();
  const isActive = () =>
    userId !== GUEST_WORKSPACE &&
    getActiveWorkspaceId() === userId &&
    getActiveDatabase() === local;
  async function pendingChanges() {
    const [ids, dirty] = await Promise.all([
      local.outbox.toCollection().primaryKeys(),
      local.meta.get(PROFILE_DIRTY),
    ]);
    return {
      count: ids.length + Number(Boolean(dirty)),
      version: JSON.stringify([ids, dirty?.value]),
    };
  }
  while (isActive()) {
    const pending = await pendingChanges();
    const answer = await confirm(pending.count);
    if (answer === false || !isActive()) return false;
    if (answer === "alternate") {
      await sync();
      continue;
    }
    // Sign-out must never leave a pending guest migration able to restore this copy.
    await prepareGuestWorkspace();
    if (!isActive()) return false;
    if ((await pendingChanges()).version !== pending.version) continue;
    await signOut();
    const activeId = getActiveWorkspaceId();
    if (activeId !== GUEST_WORKSPACE && activeId !== userId) return false;
    if (isActive()) await activateWorkspace(GUEST_WORKSPACE);
    if (getActiveWorkspaceId() !== GUEST_WORKSPACE) return false;
    await Dexie.delete(name);
    clearWorkspaceStorage(userId);
    return true;
  }
  return false;
}
