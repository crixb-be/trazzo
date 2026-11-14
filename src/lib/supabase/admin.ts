import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isServerSupabaseConfigured } from "./env";
export const createAdminClient = () =>
  isServerSupabaseConfigured()
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;
