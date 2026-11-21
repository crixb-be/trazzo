"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/Feedback";
import { startOnlineSync } from "@/lib/offline/sync";

export function AppBootstrap() {
  useEffect(() => {
    // A new service worker took over: the open page still runs the old code.
    const worker = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    const hadController = Boolean(worker?.controller);
    const onControllerChange = (): void => {
      if (!hadController) return;
      toast("Hay una versión nueva de TRAZZO.", "info", {
        label: "Actualizar",
        run: () => window.location.reload(),
      });
    };
    worker?.addEventListener("controllerchange", onControllerChange);

    const stopSync = startOnlineSync();
    return () => {
      stopSync();
      worker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
