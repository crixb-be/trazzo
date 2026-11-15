import { createHmac, timingSafeEqual } from "node:crypto";
import { isBillingCycle, type BillingCycle } from "@/lib/plans/plans";

export interface MercadoPagoSignature {
  timestamp: string;
  v1: string;
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  external_reference?: string | null;
}

export interface ExternalReference {
  userId: string;
  plan: "student" | "pro";
  cycle: BillingCycle;
}

function safeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function parseMercadoPagoSignature(header: string): MercadoPagoSignature | null {
  const timestamp = header.match(/(?:^|,)ts=([^,]+)/)?.[1];
  const v1 = header.match(/(?:^|,)v1=([^,]+)/)?.[1];
  if (!timestamp || !v1) return null;
  return { timestamp, v1 };
}

/**
 * Verifies Mercado Pago's manifest:
 * id:{data.id};request-id:{requestId};ts:{ts};
 * The optional fourth argument keeps compatibility with raw-payload tests.
 */
export function verifyMercadoPagoSignature(
  signatureHeader: string,
  secret: string,
  dataId: string,
  requestId?: string,
): boolean {
  const parsed = parseMercadoPagoSignature(signatureHeader);
  if (!parsed) return false;

  const manifest = requestId
    ? "id:" + dataId + ";request-id:" + requestId + ";ts:" + parsed.timestamp + ";"
    : dataId;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");

  return safeHexEqual(digest, parsed.v1);
}

export async function fetchPayment(
  paymentId: string,
  accessToken: string,
): Promise<MercadoPagoPayment> {
  const response = await fetch("https://api.mercadopago.com/v1/payments/" + paymentId, {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!response.ok) throw new Error("Mercado Pago rechazó la consulta del pago.");
  return (await response.json()) as MercadoPagoPayment;
}

export function parseExternalReference(value: string | null | undefined): ExternalReference | null {
  const [userId, plan, cycleValue] = (value ?? "").split(":");
  if (!userId || (plan !== "student" && plan !== "pro")) return null;
  const cycle = cycleValue ?? "monthly";
  if (!isBillingCycle(cycle)) return null;
  return { userId, plan, cycle };
}
