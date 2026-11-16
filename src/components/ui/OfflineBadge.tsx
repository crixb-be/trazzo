"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useSyncStatus } from "@/lib/offline/hooks";

export interface OfflineBadgeProps {
  lastSync?: string | null;
}

export function OfflineBadge({ lastSync }: OfflineBadgeProps) {
  const status = useSyncStatus();
  const displaySync = lastSync ?? status.lastSync;
  const label = status.online ? "En línea" : "Sin conexión";

  return (
    <span
      className={"status " + (status.online ? "online" : "offline")}
      title={displaySync ?? undefined}
    >
      {status.online ? (
        <Wifi size={13} aria-hidden="true" />
      ) : (
        <WifiOff size={13} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
