import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await client.auth.getUser();
  return response;
}
