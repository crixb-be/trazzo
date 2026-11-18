export function retryDelay(failures: number): number {
  return Math.min(60_000, 2_500 * 2 ** failures);
}

export function subscribeToSyncTriggers(
  connection: EventTarget,
  page: EventTarget & { visibilityState: string },
  requestSync: () => void,
): () => void {
  const onVisible = () => {
    if (page.visibilityState === "visible") requestSync();
  };
  connection.addEventListener("online", requestSync);
  page.addEventListener("visibilitychange", onVisible);
  return () => {
    connection.removeEventListener("online", requestSync);
    page.removeEventListener("visibilitychange", onVisible);
  };
}
