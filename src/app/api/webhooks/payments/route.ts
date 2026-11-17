import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchPayment,
  isDuplicatePaymentEvent,
  parseExternalReference,
  paymentLedgerId,
  verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago";
import { parseCulqiEvent, verifyCulqiSignature } from "@/lib/payments/culqi";
import { nextExpiry, type BillingCycle } from "@/lib/plans/plans";

export const runtime = "nodejs";

type WebhookPayload = Record<string, unknown>;

function asRecord(value: unknown): WebhookPayload {
  return typeof value === "object" && value !== null ? (value as WebhookPayload) : {};
}

/** Applies a paid plan. Throws when the database rejects the change so the provider retries. */
async function applyPlan(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  plan: "student" | "pro",
  cycle: BillingCycle,
): Promise<void> {
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("student_verified, subscription_expires_at")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  if (plan === "student" && !profile?.student_verified) {
    return;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      plan,
      subscription_expires_at: nextExpiry(
        typeof profile?.subscription_expires_at === "string"
          ? profile.subscription_expires_at
          : null,
        cycle,
      ),
      ai_queries_used: 0,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function POST(request: Request): Promise<Response> {
  const provider = new URL(request.url).searchParams.get("provider");

  if (provider !== "mercadopago" && provider !== "culqi") {
    return Response.json({ error: "Proveedor no soportado." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return Response.json(
      { error: "El webhook requiere SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  let payload: WebhookPayload;

  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }

  let eventId = "";
  let userId: string | null = null;
  let plan: "student" | "pro" | null = null;
  let approved = false;
  let status = "";
  let cycle: BillingCycle = "monthly";

  if (provider === "mercadopago") {
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (!secret || !process.env.MP_ACCESS_TOKEN) {
      return Response.json({ error: "Mercado Pago no está configurado." }, { status: 503 });
    }

    const data = asRecord(payload.data);
    eventId = String(data.id ?? payload.id ?? "");
    const signature = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id") ?? "";

    if (
      !eventId ||
      !signature ||
      !verifyMercadoPagoSignature(signature, secret, eventId, requestId)
    ) {
      return Response.json({ error: "Firma inválida." }, { status: 401 });
    }

    const payment = await fetchPayment(eventId, process.env.MP_ACCESS_TOKEN);
    const reference = parseExternalReference(payment.external_reference);
    userId = reference?.userId ?? null;
    plan = reference?.plan ?? null;
    cycle = reference?.cycle ?? "monthly";
    status = payment.status;
    approved = payment.status === "approved";
  } else {
    const secret = process.env.CULQI_WEBHOOK_SECRET;
    const signature =
      request.headers.get("x-culqi-signature") ?? request.headers.get("x-signature");

    if (!secret || !signature || !verifyCulqiSignature(signature, secret, rawBody)) {
      return Response.json({ error: "Firma inválida." }, { status: 401 });
    }

    const event = parseCulqiEvent(payload);
    eventId = event.id;
    userId = event.userId;
    plan = event.plan;
    cycle = event.cycle;
    status = event.status;
    approved = event.event === "charge.creation.succeeded" && event.status === "succeeded";
  }

  if (!eventId) {
    return Response.json({ error: "Evento sin identificador." }, { status: 400 });
  }

  // One ledger row per payment and status: a payment that is first notified as
  // "pending" must still be processed when it is later notified as "approved".
  const ledgerId = paymentLedgerId(eventId, status);

  // Claim the event before changing the profile. The primary key makes two
  // concurrent provider retries safe; only the winner can renew the plan.
  const { error: claimError } = await admin.from("payment_events").insert({
    id: ledgerId,
    provider,
    payload,
    processed_at: new Date().toISOString(),
  });
  if (claimError) {
    if (isDuplicatePaymentEvent(claimError)) {
      return Response.json({ received: true, idempotent: true });
    }
    console.error("No se pudo registrar el evento de pago", claimError);
    return Response.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }

  if (approved && userId && plan) {
    try {
      await applyPlan(admin, userId, plan, cycle);
    } catch (error) {
      // Not recorded as processed: a non-200 makes the provider send it again.
      await admin.from("payment_events").delete().eq("id", ledgerId);
      console.error("No se pudo aplicar el plan pagado", error);
      return Response.json({ error: "No se pudo aplicar el plan." }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
