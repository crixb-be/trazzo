import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isDuplicatePaymentEvent,
  parseExternalReference,
  paymentLedgerId,
  verifyMercadoPagoSignature,
} from "./mercadopago";
import { parseCulqiEvent, verifyCulqiSignature } from "./culqi";
import { billingViewState } from "./billing-view";
import { paymentProviderAvailability } from "./providers";

describe("payment signatures", () => {
  it("verifies the Mercado Pago manifest", () => {
    const secret = "test-secret";
    const timestamp = "1700000000";
    const manifest = "id:123;request-id:req-1;ts:" + timestamp + ";";
    const digest = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(
      verifyMercadoPagoSignature("ts=" + timestamp + ",v1=" + digest, secret, "123", "req-1"),
    ).toBe(true);
  });

  it("rejects an invalid Mercado Pago signature", () => {
    expect(verifyMercadoPagoSignature("ts=1,v1=bad", "secret", "123", "req")).toBe(false);
  });

  it("parses an external reference", () => {
    expect(parseExternalReference("user-1:pro:annual")).toEqual({
      userId: "user-1",
      plan: "pro",
      cycle: "annual",
    });
    expect(parseExternalReference("user-1:pro")).toEqual({
      userId: "user-1",
      plan: "pro",
      cycle: "monthly",
    });
    expect(parseExternalReference("user-1:pro:weekly")).toBeNull();
    expect(parseExternalReference("user-1:free")).toBeNull();
  });

  it("verifies a Culqi HMAC", () => {
    const body = '{"id":"evt_1"}';
    const digest = createHmac("sha256", "culqi-secret").update(body).digest("hex");
    expect(verifyCulqiSignature(digest, "culqi-secret", body)).toBe(true);
  });

  it("rejects a Culqi HMAC with a changed body", () => {
    const body = '{"id":"evt_1"}';
    const digest = createHmac("sha256", "culqi-secret").update(body).digest("hex");
    expect(verifyCulqiSignature(digest, "culqi-secret", body + " ")).toBe(false);
  });

  it("parses Culqi metadata", () => {
    const event = parseCulqiEvent({
      id: "evt_1",
      event: "charge.creation.succeeded",
      data: {
        status: "succeeded",
        metadata: { user_id: "user-1", plan: "student", cycle: "annual" },
      },
    });
    expect(event.userId).toBe("user-1");
    expect(event.plan).toBe("student");
    expect(event.cycle).toBe("annual");
  });

  it("builds an idempotency key per event and status", () => {
    expect(paymentLedgerId("pay_1", "approved")).toBe("pay_1:approved");
    expect(paymentLedgerId("pay_1", "")).toBe("pay_1:unknown");
    expect(isDuplicatePaymentEvent({ code: "23505" })).toBe(true);
    expect(isDuplicatePaymentEvent({ code: "42501" })).toBe(false);
  });

  it("shows native account sync and web checkout states", () => {
    const unavailable = paymentProviderAvailability({});
    expect(billingViewState(true, "pro", unavailable)).toMatchObject({
      mode: "native",
      showCheckout: false,
      currentPlanLabel: "Pro",
    });
    expect(billingViewState(false, "free", unavailable)).toMatchObject({
      mode: "web",
      showCheckout: true,
      message: "Pasarela en modo demo / sin configurar",
    });
  });
});
