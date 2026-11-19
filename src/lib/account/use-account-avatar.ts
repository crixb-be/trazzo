"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useStudioProfile } from "@/lib/offline/hooks";
import { createClient } from "@/lib/supabase/client";

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
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setProvider(providerAvatar(data.session?.user));
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setProvider(providerAvatar(session?.user));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (avatarDataUrl) return { src: avatarDataUrl, own: true };
  return { src: provider, own: false };
}
