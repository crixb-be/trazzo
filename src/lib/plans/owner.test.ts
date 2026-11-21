import { afterEach, describe, expect, it, vi } from "vitest";
import { isOwnerAccount, ownerAccountReason } from "./owner";

afterEach(() => vi.unstubAllEnvs());

describe("isOwnerAccount", () => {
  it("matches a configured email regardless of case or surrounding spaces", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", " , first@example.test, OWNER@example.test ");
    expect(isOwnerAccount({ signedIn: true, email: " Owner@Example.Test " })).toBe(true);
    expect(isOwnerAccount({ signedIn: true, email: "other@example.test" })).toBe(false);
  });

  it("accepts an additional email list in the server caller", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "");
    const account = { signedIn: true, email: "owner@example.test" };
    expect(isOwnerAccount(account, " OWNER@example.test ")).toBe(true);
    expect(isOwnerAccount(account)).toBe(false);
  });

  it.each([
    [{ capNumber: "CAP 38-255" }, "cap"],
    [{ ruc: "20-61491877-3" }, "ruc"],
  ])("requires a signed-in account for a matching studio identifier", (studio, reason) => {
    expect(ownerAccountReason({ ...studio, signedIn: true })).toBe(reason);
    expect(isOwnerAccount({ ...studio, signedIn: false })).toBe(false);
  });

  it("rejects missing email and non-matching studio identifiers", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", ", ,");
    expect(isOwnerAccount({ signedIn: true, email: "", capNumber: "123", ruc: "123" })).toBe(false);
  });
});
