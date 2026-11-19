import { describe, expect, it } from "vitest";
import { providerAvatar } from "./use-account-avatar";

describe("foto del proveedor de inicio de sesión", () => {
  it("usa avatar_url o picture de Google, solo por https", () => {
    expect(
      providerAvatar({ user_metadata: { avatar_url: "https://lh3.googleusercontent.com/a" } }),
    ).toBe("https://lh3.googleusercontent.com/a");
    expect(
      providerAvatar({ user_metadata: { picture: "https://lh3.googleusercontent.com/b" } }),
    ).toBe("https://lh3.googleusercontent.com/b");
    expect(
      providerAvatar({ user_metadata: { avatar_url: "http://inseguro.test/a.png" } }),
    ).toBeNull();
    expect(providerAvatar({ user_metadata: { avatar_url: "javascript:alert(1)" } })).toBeNull();
    expect(providerAvatar({ user_metadata: {} })).toBeNull();
    expect(providerAvatar(null)).toBeNull();
  });
});
