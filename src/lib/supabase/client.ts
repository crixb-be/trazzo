import {
  combineChunks,
  createBrowserClient,
  parseCookieHeader,
  stringFromBase64URL,
} from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./env";
export const createClient = () =>
  isSupabaseConfigured()
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : null;

export type WorkspaceUser = { id: string; email?: string; user_metadata: Record<string, unknown> };

/** Read only the identity of the browser session when token refresh is unavailable. */
export async function readStoredWorkspaceUser(): Promise<WorkspaceUser | null> {
  if (!isSupabaseConfigured() || typeof document === "undefined") return null;
  try {
    // Match the SDK's default auth cookie name and SSR chunk encoding.
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const cookies = new Map(
      parseCookieHeader(document.cookie).map(({ name, value }) => [name, value]),
    );
    const raw = await combineChunks(`sb-${project}-auth-token`, (name) => cookies.get(name));
    if (!raw) return null;
    const session = JSON.parse(raw.startsWith("base64-") ? stringFromBase64URL(raw.slice(7)) : raw);
    const user = session?.user as Partial<WorkspaceUser> | undefined;
    if (typeof user?.id !== "string") return null;
    return {
      id: user.id,
      email: typeof user.email === "string" ? user.email : undefined,
      user_metadata:
        typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {},
    };
  } catch {
    return null;
  }
}

/** A sync pass stays scoped to the account that started it, even across auth changes. */
export const createSyncClient = (accessToken: string) =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => accessToken },
  );
