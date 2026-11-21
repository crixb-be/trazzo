import { Cloud, CloudOff, CloudAlert, CloudUpload } from "lucide-react";
import type { SyncStatus } from "./sync";

export function syncPresentation(status: SyncStatus) {
  if (status.accountMismatch)
    return {
      long: "Datos de otra cuenta en este dispositivo",
      short: "Otra cuenta",
      icon: CloudAlert,
      backedUp: false,
    };
  if (!status.configured || !status.signedIn)
    return {
      long: "Guardado en este dispositivo",
      short: "Local",
      icon: CloudOff,
      backedUp: false,
    };
  if (status.syncing)
    return {
      long: "Sincronizando…",
      short: "En curso",
      icon: CloudUpload,
      backedUp: false,
    };
  if (status.pending || status.error)
    return {
      long: "Pendiente de sincronizar",
      short: "Pendiente",
      icon: CloudUpload,
      backedUp: false,
    };
  if (status.lastSync)
    return {
      long: "Respaldado en la nube",
      short: "En la nube",
      icon: Cloud,
      backedUp: true,
    };
  return { long: "Guardado en este dispositivo", short: "Local", icon: CloudOff, backedUp: false };
}
