import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./env";
export const createClient = () =>
  isSupabaseConfigured()
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : null;
