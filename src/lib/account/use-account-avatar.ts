"use client";

import { useWorkspace } from "@/components/layout/WorkspaceProvider";
import type { User } from "@supabase/supabase-js";
import { useStudioProfile } from "@/lib/offline/hooks";

/** Photo offered by the sign-in provider (Google sends `avatar_url` or `picture`). */
export function providerAvatar(
  user: Pick<User, "user_metadata"> | null | undefined,
): string | null {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["avatar_url", "picture"]) {
    const value = metadata[key];
    if (typeof value === "string" && /^https:\/\//.test(value)) return value;
  }
  return null;
}

/**
 * The avatar to show for the account: the photo the user uploaded (synced through
 * `profiles` into IndexedDB, so it updates live when another device changes it),
 * else the sign-in provider's photo, else nothing.
 */
export function useAccountAvatar(): { src: string | null; own: boolean } {
  const { avatarDataUrl } = useStudioProfile();
  const { user } = useWorkspace();

  if (avatarDataUrl) return { src: avatarDataUrl, own: true };
  return { src: providerAvatar(user), own: false };
}
