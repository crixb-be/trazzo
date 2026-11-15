import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseExternalReference, verifyMercadoPagoSignature } from "./mercadopago";
import { parseCulqiEvent, verifyCulqiSignature } from "./culqi";

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
});
