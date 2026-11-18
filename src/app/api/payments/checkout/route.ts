import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { planPrice, PLANS } from "@/lib/plans/plans";
import { isPaymentProvider, paymentProviderAvailability } from "@/lib/payments/providers";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["student", "pro"]),
  cycle: z.enum(["monthly", "annual"]).default("monthly"),
  provider: z.enum(["mercadopago", "culqi"]).default("mercadopago"),
});

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof checkoutSchema>;

  try {
    body = checkoutSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Plan de checkout inválido." }, { status: 400 });
  }

  if (!isPaymentProvider(body.provider)) {
    return Response.json({ error: "Proveedor de pago inválido." }, { status: 400 });
  }

  const availability = paymentProviderAvailability(process.env);
  if (!availability[body.provider]) {
    return Response.json(
      { error: "Pasarela en modo demo / sin configurar", code: "payment_not_configured" },
      { status: 503 },
    );
  }

  if (body.provider === "culqi") {
    return Response.json(
      { error: "Culqi requiere completar la tokenización web antes de iniciar el checkout." },
      { status: 501 },
    );
  }

  const supabase = await createClient();

  if (!supabase) {
    return Response.json(
      { error: "Supabase no está configurado. El checkout requiere una cuenta activa." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Debes iniciar sesión para suscribirte." }, { status: 401 });
  }

  const token = process.env.MP_ACCESS_TOKEN;

  if (!token) {
    return Response.json(
      { error: "Mercado Pago no está configurado en este entorno." },
      { status: 501 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const plan = PLANS[body.plan];
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          id: "trazzo-" + body.plan + "-" + body.cycle,
          title: "TRAZO " + plan.label + " · " + (body.cycle === "annual" ? "Anual" : "Mensual"),
          quantity: 1,
          currency_id: "PEN",
          unit_price: planPrice(body.plan, body.cycle),
        },
      ],
      external_reference: user.id + ":" + body.plan + ":" + body.cycle,
      back_urls: {
        success: appUrl + "/cuenta?payment=success",
        failure: appUrl + "/cuenta?payment=failure",
        pending: appUrl + "/cuenta?payment=pending",
      },
      auto_return: "approved",
      notification_url: appUrl + "/api/webhooks/payments?provider=mercadopago",
    }),
  });

  if (!response.ok) {
    return Response.json({ error: "Mercado Pago no pudo crear la preferencia." }, { status: 502 });
  }

  const preference = (await response.json()) as {
    init_point?: string;
    sandbox_init_point?: string;
  };
  const initPoint = preference.init_point ?? preference.sandbox_init_point;

  if (!initPoint) {
    return Response.json({ error: "Mercado Pago no devolvió un enlace de pago." }, { status: 502 });
  }

  return Response.json({ init_point: initPoint });
}
