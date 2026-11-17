import { isServerSupabaseConfigured } from "@/lib/supabase/env";
import { paymentProviderAvailability } from "@/lib/payments/providers";

export const runtime = "nodejs";

/** Returns capability flags, never credentials, for the web plans screen. */
export function GET(): Response {
  return Response.json({
    supabase: isServerSupabaseConfigured(),
    providers: paymentProviderAvailability(process.env),
  });
}

