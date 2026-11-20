export type PaymentProvider = "mercadopago" | "culqi";

export interface PaymentProviderAvailability {
  mercadopago: boolean;
  culqi: boolean;
}

export const DEMO_PAYMENT_MESSAGE = "Pasarela en modo demo / sin configurar";

/** Server-only environment check; only booleans are safe to expose to the UI. */
export function paymentProviderAvailability(
  env: Record<string, string | undefined>,
): PaymentProviderAvailability {
  const culqiPublicKey = env.CULQI_PUBLIC_KEY ?? env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  return {
    mercadopago: Boolean(env.MP_ACCESS_TOKEN && env.MP_WEBHOOK_SECRET),
    culqi: Boolean(culqiPublicKey && env.CULQI_SECRET_KEY && env.CULQI_WEBHOOK_SECRET),
  };
}

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === "mercadopago" || value === "culqi";
}
