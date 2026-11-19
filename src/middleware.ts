import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Static brand assets and link previews skip the session refresh: crawlers fetch them cold.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|brand|og-image\\.png|og-square\\.png|sw\\.js|manifest\\.webmanifest).*)",
  ],
};
