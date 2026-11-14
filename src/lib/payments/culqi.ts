import { createHmac, timingSafeEqual } from "node:crypto";

export interface CulqiEvent {
  id: string;
  event: string;
  status: string;
  userId: string | null;
  plan: "student" | "pro" | null;
  payload: unknown;
}

function safeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

/** Verifies the HMAC-SHA256 Culqi webhook signature against the raw request body. */
export function verifyCulqiSignature(
  signature: string,
  secret: string,
  rawPayload: string,
): boolean {
  const digest = createHmac("sha256", secret).update(rawPayload).digest("hex");
  return safeHexEqual(digest, signature.trim());
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Extracts the idempotency id and billing metadata from a Culqi event payload. */
export function parseCulqiEvent(payload: unknown): CulqiEvent {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const metadata = asRecord(data.metadata);
  const planValue = metadata.plan;
  const plan = planValue === "student" || planValue === "pro" ? planValue : null;

  return {
    id: typeof root.id === "string" ? root.id : "",
    event: typeof root.event === "string" ? root.event : "",
    status: typeof data.status === "string" ? data.status : "",
    userId: typeof metadata.user_id === "string" ? metadata.user_id : null,
    plan,
    payload,
  };
}
