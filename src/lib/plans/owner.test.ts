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

  it("requires a signed-in account even for a listed email", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "owner@example.test");
    expect(ownerAccountReason({ signedIn: true, email: "owner@example.test" })).toBe("email");
    expect(isOwnerAccount({ signedIn: false, email: "owner@example.test" })).toBe(false);
  });

  it("never grants access from studio identifiers such as CAP or RUC", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", "owner@example.test");
    const studio = { capNumber: "38255", ruc: "20614918773" };
    expect(isOwnerAccount({ ...studio, signedIn: true } as never)).toBe(false);
    expect(
      isOwnerAccount({ ...studio, signedIn: true, email: "other@example.test" } as never),
    ).toBe(false);
  });

  it("rejects a missing email and an empty list", () => {
    vi.stubEnv("NEXT_PUBLIC_TRAZZO_OWNER_EMAILS", ", ,");
    expect(isOwnerAccount({ signedIn: true, email: "" })).toBe(false);
    expect(isOwnerAccount({ signedIn: true, email: null })).toBe(false);
  });
});
