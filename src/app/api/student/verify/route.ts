import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isEduPeEmail } from "@/lib/plans/plans";

export const runtime = "nodejs";

/**
 * Verifies a student by their institutional email. Signing in already proved
 * that the person controls the address, so a confirmed .edu.pe account is
 * enough; anyone else sends a document for manual review instead.
 */
export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) {
    return Response.json(
      { error: "La verificación no está disponible en este momento." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Inicia sesión para verificar tu cuenta." }, { status: 401 });
  }

  if (!user.email || !isEduPeEmail(user.email) || !user.email_confirmed_at) {
    return Response.json(
      {
        error:
          "Tu cuenta debe usar un correo .edu.pe confirmado. Si no tienes uno, adjunta tu carné o constancia.",
      },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({ student_verified: true })
    .eq("id", user.id);
  if (error) {
    return Response.json({ error: "No se pudo registrar la verificación." }, { status: 500 });
  }
  return Response.json({ verified: true });
}
