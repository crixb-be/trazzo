import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchPayment,
  parseExternalReference,
  verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago";
import { parseCulqiEvent, verifyCulqiSignature } from "@/lib/payments/culqi";
import { subscriptionDays, type BillingCycle } from "@/lib/plans/plans";

export const runtime = "nodejs";

type WebhookPayload = Record<string, unknown>;

function asRecord(value: unknown): WebhookPayload {
  return typeof value === "object" && value !== null ? (value as WebhookPayload) : {};
}

function addSubscriptionDays(cycle: BillingCycle): string {
  return new Date(Date.now() + subscriptionDays(cycle) * 24 * 60 * 60 * 1000).toISOString();
}

async function applyPlan(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  plan: "student" | "pro",
  cycle: BillingCycle,
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("student_verified")
    .eq("id", userId)
    .maybeSingle();

  if (plan === "student" && !profile?.student_verified) {
    return;
  }

  await admin
    .from("profiles")
    .update({
      plan,
      subscription_expires_at: addSubscriptionDays(cycle),
      ai_queries_used: 0,
    })
    .eq("id", userId);
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
    approved = event.event === "charge.creation.succeeded" && event.status === "succeeded";
  }

  if (!eventId) {
    return Response.json({ error: "Evento sin identificador." }, { status: 400 });
  }

  const { data: previousEvent } = await admin
    .from("payment_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (previousEvent) {
    return Response.json({ received: true, idempotent: true });
  }

  await admin.from("payment_events").insert({
    id: eventId,
    provider,
    payload,
    processed_at: new Date().toISOString(),
  });

  if (approved && userId && plan) {
    await applyPlan(admin, userId, plan, cycle);
  }

  return Response.json({ received: true });
}
