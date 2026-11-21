import { Cloud, CloudAlert, CloudOff, CloudUpload } from "lucide-react";
import { expect, it } from "vitest";
import { syncPresentation } from "./sync-presentation";
import type { SyncStatus } from "./sync";

const local: SyncStatus = {
  configured: false,
  signedIn: false,
  online: true,
  syncing: false,
  accountMismatch: false,
  pending: 3,
  lastSync: null,
  error: null,
};

it("keeps local work local even when it has queued writes", () => {
  expect(syncPresentation(local)).toEqual({
    long: "Guardado en este dispositivo",
    short: "Local",
    icon: CloudOff,
    backedUp: false,
  });
  expect(syncPresentation({ ...local, configured: true, error: "Reintentar" }).short).toBe("Local");
});

it("gives account mismatch priority and keeps text and icon in agreement", () => {
  expect(syncPresentation({ ...local, syncing: true, accountMismatch: true })).toMatchObject({
    short: "Revisa tu sesión",
    icon: CloudAlert,
    backedUp: false,
  });
  const account = { ...local, configured: true, signedIn: true, lastSync: "ahora" };
  expect(syncPresentation(account)).toMatchObject({ short: "Pendiente", icon: CloudUpload });
  expect(syncPresentation({ ...account, pending: 0 })).toMatchObject({
    short: "En la nube",
    icon: Cloud,
    backedUp: true,
  });
});
