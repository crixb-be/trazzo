import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
export function useLibraryActivity() {
  return useLiveQuery(async () => (db ? db.library_activity.toArray() : []), [], []) ?? [];
}
export async function recordVisit(slug: string) {
  if (!db) return;
  const old = await db.library_activity.get(slug);
  await db.library_activity.put({
    slug,
    favorite: old?.favorite ?? false,
    visitedAt: new Date().toISOString(),
  });
}
export async function toggleFavorite(slug: string) {
  if (!db) return;
  await db.transaction("rw", db.library_activity, async () => {
    const old = await db!.library_activity.get(slug);
    await db!.library_activity.put({
      slug,
      visitedAt: old?.visitedAt ?? "",
      favorite: !old?.favorite,
    });
  });
}
